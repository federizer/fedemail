package repository

import (
	"database/sql"
	"errors"
	"time"
)

var (
	ErrUsernameAlreadyTaken     = errors.New("username already taken")
	ErrUsernameNotFound         = errors.New("username not found")
	ErrInvalidCredentials       = errors.New("invalid authentication credentials")
	ErrMissingUserContext       = errors.New("missing user context")
	ErrInvalidOrMissingSession  = errors.New("invalid or missing session")
	ErrFailedValidationResponse = errors.New("failed validation")
	ErrContactNotFound          = errors.New("contact not found")
	ErrDuplicateContact         = errors.New("contact already exists")
	ErrInvalidEmailAddress      = errors.New("invalid email address")
	ErrBlobNotFound             = errors.New("blob not found")
	ErrFileNotFound             = errors.New("file not found")
	ErrDraftNotFound            = errors.New("draft not found")
	ErrMissingUrisField         = errors.New("missing 'uris' field")
	ErrMissingUriField          = errors.New("missing 'uri' field")
	ErrMissingPayloadField      = errors.New("missing 'payload' field")
	ErrMissingHeadersField      = errors.New("missing 'headers' field")
)

type History struct {
	Id int64 `json:"historyId"`
}

type Uri struct {
	Uri string `json:"uri"`
}

type Uris struct {
	Uris []string `json:"uris"`
}

type Repository struct {
	Blobs    BlobRepository
	Files    FileRepository
	Session  SessionRepository
	User     UserRepository
	Contacts ContactRepository
	Drafts   DraftRepository
	Messages MessageRepository
}

func NewRepository(db *sql.DB) Repository {
	return Repository{
		Blobs:    BlobRepository{db: db},
		Files:    FileRepository{db: db},
		Session:  SessionRepository{db: db},
		User:     UserRepository{db: db},
		Contacts: ContactRepository{db: db},
		Drafts:   DraftRepository{db: db},
		Messages: MessageRepository{db: db},
	}
}

type Timestamp int64

func (p *Timestamp) Scan(value interface{}) error {
	t := value.(time.Time).UnixMilli()
	*p = Timestamp(t)
	return nil
}

func getPrefixedDeviceId(userDeviceId *string) *string {
	var deviceId string

	if userDeviceId != nil && len(*userDeviceId) > 0 {
		deviceId = "device:" + *userDeviceId
		return &deviceId
	}

	return nil
}
