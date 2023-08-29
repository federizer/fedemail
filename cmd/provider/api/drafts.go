package api

import (
	"cargomail/cmd/provider/api/helper"
	"cargomail/internal/repository"
	"encoding/json"
	"errors"
	"net/http"
)

type DraftsApi struct {
	drafts repository.DraftRepository
}

func (api *DraftsApi) Create() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := r.Context().Value(repository.UserContextKey).(*repository.User)
		if !ok {
			helper.ReturnErr(w, repository.ErrMissingUserContext, http.StatusInternalServerError)
			return
		}

		var draft *repository.Draft

		err := helper.Decoder(r.Body).Decode(&draft)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		draft, err = api.drafts.Create(user, draft)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		helper.SetJsonResponse(w, http.StatusCreated, draft)
	})
}

func (api *DraftsApi) List() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := r.Context().Value(repository.UserContextKey).(*repository.User)
		if !ok {
			helper.ReturnErr(w, repository.ErrMissingUserContext, http.StatusInternalServerError)
			return
		}

		draftHistory, err := api.drafts.List(user)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		helper.SetJsonResponse(w, http.StatusOK, draftHistory)
	})
}

func (api *DraftsApi) Sync() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := r.Context().Value(repository.UserContextKey).(*repository.User)
		if !ok {
			helper.ReturnErr(w, repository.ErrMissingUserContext, http.StatusInternalServerError)
			return
		}

		var history *repository.History

		err := helper.Decoder(r.Body).Decode(&history)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		draftHistory, err := api.drafts.Sync(user, history)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		helper.SetJsonResponse(w, http.StatusOK, draftHistory)
	})
}

func (api *DraftsApi) Update() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := r.Context().Value(repository.UserContextKey).(*repository.User)
		if !ok {
			helper.ReturnErr(w, repository.ErrMissingUserContext, http.StatusInternalServerError)
			return
		}

		var draft *repository.Draft

		err := helper.Decoder(r.Body).Decode(&draft)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if draft.Uri == "" {
			http.Error(w, repository.ErrMissingUriField.Error(), http.StatusBadRequest)
			return
		}

		if draft.Payload == nil {
			http.Error(w, repository.ErrMissingPayloadField.Error(), http.StatusBadRequest)
			return
		}

		if draft.Payload.Headers == nil {
			http.Error(w, repository.ErrMissingHeadersField.Error(), http.StatusBadRequest)
			return
		}

		draft, err = api.drafts.Update(user, draft)
		if err != nil {
			switch {
			case errors.Is(err, repository.ErrDraftNotFound):
				helper.ReturnErr(w, err, http.StatusNotFound)
			default:
				helper.ReturnErr(w, err, http.StatusInternalServerError)
			}
			return
		}

		helper.SetJsonResponse(w, http.StatusOK, draft)
	})
}

func (api *DraftsApi) Trash() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := r.Context().Value(repository.UserContextKey).(*repository.User)
		if !ok {
			helper.ReturnErr(w, repository.ErrMissingUserContext, http.StatusInternalServerError)
			return
		}

		var uris repository.Uris

		err := helper.Decoder(r.Body).Decode(&uris)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if uris.Uris == nil {
			http.Error(w, repository.ErrMissingUrisField.Error(), http.StatusBadRequest)
			return
		}

		// back to body
		body, err := json.Marshal(uris)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		urisString := string(body)

		err = api.drafts.Trash(user, urisString)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		helper.SetJsonResponse(w, http.StatusOK, map[string]string{"status": "OK"})
	})
}

func (api *DraftsApi) Untrash() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := r.Context().Value(repository.UserContextKey).(*repository.User)
		if !ok {
			helper.ReturnErr(w, repository.ErrMissingUserContext, http.StatusInternalServerError)
			return
		}

		var uris repository.Uris

		err := helper.Decoder(r.Body).Decode(&uris)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if uris.Uris == nil {
			http.Error(w, repository.ErrMissingUrisField.Error(), http.StatusBadRequest)
			return
		}

		// back to body
		body, err := json.Marshal(uris)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		urisString := string(body)

		err = api.drafts.Untrash(user, urisString)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		helper.SetJsonResponse(w, http.StatusOK, map[string]string{"status": "OK"})
	})
}

func (api *DraftsApi) Delete() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := r.Context().Value(repository.UserContextKey).(*repository.User)
		if !ok {
			helper.ReturnErr(w, repository.ErrMissingUserContext, http.StatusInternalServerError)
			return
		}

		var uris repository.Uris

		err := helper.Decoder(r.Body).Decode(&uris)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if uris.Uris == nil {
			http.Error(w, repository.ErrMissingUrisField.Error(), http.StatusBadRequest)
			return
		}

		// back to body
		body, err := json.Marshal(uris)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		urisString := string(body)

		err = api.drafts.Delete(user, urisString)
		if err != nil {
			helper.ReturnErr(w, err, http.StatusInternalServerError)
			return
		}

		helper.SetJsonResponse(w, http.StatusOK, map[string]string{"status": "OK"})
	})
}

func (api *DraftsApi) Send() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := r.Context().Value(repository.UserContextKey).(*repository.User)
		if !ok {
			helper.ReturnErr(w, repository.ErrMissingUserContext, http.StatusInternalServerError)
			return
		}

		var draft *repository.Draft

		err := helper.Decoder(r.Body).Decode(&draft)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if draft.Uri == "" {
			http.Error(w, repository.ErrMissingUriField.Error(), http.StatusBadRequest)
			return
		}

		if draft.Payload == nil {
			http.Error(w, repository.ErrMissingPayloadField.Error(), http.StatusBadRequest)
			return
		}

		if draft.Payload.Headers == nil {
			http.Error(w, repository.ErrMissingHeadersField.Error(), http.StatusBadRequest)
			return
		}

		message, err := api.drafts.Send(user, draft)
		if err != nil {
			switch {
			case errors.Is(err, repository.ErrDraftNotFound):
				helper.ReturnErr(w, err, http.StatusNotFound)
			default:
				helper.ReturnErr(w, err, http.StatusInternalServerError)
			}
			return
		}

		helper.SetJsonResponse(w, http.StatusOK, message)
	})
}
