import DataTable from "datatables.net";

// import $ from 'jquery';

import "datatables.net-bs5";
import "datatables.net-select";
import "datatables.net-select-bs5";
import "datatables.net-buttons";
import "datatables.net-buttons-bs5";
import "datatables.net-responsive";
import "datatables.net-responsive-bs5";

import { composeContentPage } from "/public/js/menu.js";
import {
  clearForm as composeClearForm,
  populateForm as composePopulateForm,
} from "/public/js/compose.js";
import { sentTable } from "/public/js/sent.js";
import {
  parsePayload,
  composePayload,
  createSubjectSnippet,
  createPlainContentSnippet,
} from "/public/js/utils.js";

let selectedUris = [];

const draftsConfirmDialog = new bootstrap.Modal(
  document.querySelector("#draftsConfirmDialog")
);

const draftsFormAlert = document.getElementById("draftsFormAlert");

const composeUriInput = document.getElementById("composeUriInput");

let formIsPopulated = false;

let historyId = 0;

const draftsTable = new DataTable("#draftsTable", {
  paging: true,
  responsive: {
    details: false,
  },
  ajax: function (data, callback, settings) {
    (async () => {
      const response = await api(
        draftsFormAlert.id,
        200,
        `${window.apiHost}/api/v1/drafts`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response === false) {
        return;
      }

      historyId = response.lastHistoryId;

      callback({ data: response.drafts });
    })();
  },
  ordering: true,
  columns: [
    { data: "uri", visible: false, searchable: false },
    { data: null, visible: true, orderable: false, width: "15px" },
    {
      data: "payload",
      className: "payload",
      orderable: false,
      render: (data, type, full, meta) => {
        const parsed = parsePayload(full.uri, full.payload);

        const link = `${window.apiHost}/api/v1/files/`;
        const attachmentLinks = [];

        for (const attachment of parsed.attachments) {
          const attachmentAnchor = `<a class="attachmentLink" href="javascript:;" onclick="downloadUri('draftsFormAlert', '${link}${attachment.uri}', '${attachment.fileName}');">${attachment.fileName}</a>`;
          attachmentLinks.push(attachmentAnchor);
        }

        const subject =
          type === "display"
            ? createSubjectSnippet(parsed.subject)
            : parsed.subject;
        const plainContent =
          type === "display"
            ? createPlainContentSnippet(parsed.plainContent)
            : parsed.plainContent;

        let content;

        if (subject) {
          content = subject;
          if (plainContent) {
            content = subject + " - " + plainContent;
          }
        } else {
          if (plainContent) {
            content = plainContent;
          }
        }

        let renderHtml = `<div role="button"><span>${
          content || "Draft"
        }</span>`;
        if (attachmentLinks.length > 0) {
          renderHtml += `<br/>`;
          for (const item of attachmentLinks) {
            renderHtml += `<span>${item}  </span>`;
          }
        }
        renderHtml += "</div>"

        return renderHtml;
      },
    },
    {
      data: null,
      visible: false,
      orderable: true,
      render: (data, type, full, meta) => {
        const date = full.modifiedAt != null ? full.modifiedAt : full.createdAt;
        return date;
      },
    },
  ],
  rowId: "uri",
  columnDefs: [
    {
      targets: 1,
      orderable: false,
      className: "select-checkbox",
      data: null,
      defaultContent: "",
    },
  ],
  select: {
    style: "multi",
    selector: "td:first-child",
    info: true,
  },
  order: [[3, "desc"]],
  dom: "Bfrtip",
  language: {
    buttons: {
      pageLength: "Show %d",
    },
  },
  lengthMenu: [
    [10, 25, 50],
    ["10 rows", "25 rows", "50 rows"],
  ],
  buttons: [
    // "pageLength",
    {
      text: "Refresh",
      action: function () {
        (async () => {
          const response = await api(
            draftsFormAlert.id,
            200,
            `${window.apiHost}/api/v1/drafts/sync`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ historyId: historyId }),
            }
          );

          if (response === false) {
            return;
          }

          historyId = response.lastHistoryId;

          for (const draft of response.inserted) {
            // https://datatables.net/forums/discussion/59343/duplicate-data-in-the-data-table
            const notFound =
              draftsTable.column(0).data().toArray().indexOf(draft.uri) === -1; // !!! must be
            if (notFound) {
              draftsTable.row.add(draft);
            }
          }

          for (const draft of response.updated) {
            // https://datatables.net/forums/discussion/59343/duplicate-data-in-the-data-table
            const notFound =
              draftsTable.column(0).data().toArray().indexOf(draft.uri) === -1; // !!! must be
            if (notFound) {
              draftsTable.row.add(draft);
            } else {
              draftsTable.row(`#${draft.uri}`).data(draft);

              if (draft.uri == composeUriInput.value) {
                try {
                  const parsed = parsePayload(draft.uri, draft.payload);

                  formIsPopulated = true;
                  composePopulateForm(draft.uri, parsed);
                } finally {
                  formIsPopulated = false;
                }
              }
            }
          }

          for (const draft of response.trashed) {
            draftsTable.row(`#${draft.uri}`).remove();

            if (draft.uri == composeUriInput.value) {
              try {
                formIsPopulated = true;
                composeClearForm();
              } finally {
                formIsPopulated = false;
              }
            }
          }

          for (const draft of response.deleted) {
            draftsTable.row(`#${draft.uri}`).remove();

            if (draft.uri == composeUriInput.value) {
              try {
                formIsPopulated = true;
                composeClearForm();
              } finally {
                formIsPopulated = false;
              }
            }
          }

          draftsTable.draw();
        })();
      },
    },
    {
      text: "Delete",
      className: "drafts-delete",
      enabled: false,
      action: function () {
        selectedUris = [];

        const selectedData = draftsTable
          .rows(".selected")
          .data()
          .map((obj) => obj.uri);
        if (selectedData.length > 0) {
          draftsConfirmDialog.show();
          for (let i = 0; i < selectedData.length; i++) {
            selectedUris.push(selectedData[i]);
          }
        }
      },
    },
  ],
});

draftsTable.on("click", "td.payload", (e) => {
  if (e.target.classList.contains("attachmentLink")) {
    return
  }

  const data = draftsTable.row(e.currentTarget).data();
  const parsed = parsePayload(data.uri, data.payload);

  try {
    formIsPopulated = true;
    composePopulateForm(data.uri, parsed);
  } finally {
    formIsPopulated = false;
  }

  composeContentPage(e);
});

draftsTable.on("select.dt deselect.dt", () => {
  const selectedRows = draftsTable.rows({ selected: true }).indexes().length;
  const selected = selectedRows > 0;
  draftsTable.buttons([".drafts-delete"]).enable(selected ? true : false);
});

export const deleteDraftsMessages = (e) => {
  e?.preventDefault();

  draftsConfirmDialog.hide();

  (async () => {
    const response = await api(
      draftsFormAlert.id,
      200,
      `${window.apiHost}/api/v1/drafts/trash`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: selectedUris }),
      }
    );

    if (response === false) {
      return;
    }

    if (selectedUris.includes(composeUriInput.value)) {
      try {
        formIsPopulated = true;
        composeClearForm();
      } finally {
        formIsPopulated = false;
      }
    }

    draftsTable.rows(".selected").remove().draw();
    draftsTable.buttons([".drafts-delete"]).enable(false);
  })();
};

export const deleteDraft = async (composeForm, uri) => {
  const response = await api(
    composeForm.id,
    200,
    `${window.apiHost}/api/v1/drafts/trash`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: [uri] }),
    }
  );

  if (response === false) {
    return;
  }

  draftsTable.rows(`#${uri}`).remove().draw();
  draftsTable
    .buttons([".drafts-delete"])
    .enable(draftsTable.rows().count() > 0);

  try {
    formIsPopulated = true;
    composeClearForm();
  } finally {
    formIsPopulated = false;
  }
};

export const upsertDraftsPage = async (composeForm, uri, parsed) => {
  if (!formIsPopulated) {
    const alert = composeForm.querySelector(
      'div[name="upsertDraftsPageAlert"]'
    );
    if (alert) alert.remove();

    if (uri) {
      // update
      const index = draftsTable.column(0).data().toArray().indexOf(uri);

      if (index >= 0) {
        const data = draftsTable.row(`#${uri}`).data();
        const draft = { uri, payload: composePayload(parsed) };

        if (data.labelIds) draft.labelIds = data.labelIds;
        if (data.unread) draft.unread = data.unread;
        if (data.starred) draft.starred = data.starred;
        if (data.createdAt) draft.createdAt = data.createdAt;
        if (data.modifiedAt) draft.modifiedAt = data.modifiedAt;

        const response = await api(
          composeForm.id,
          200,
          `${window.apiHost}/api/v1/drafts`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(draft),
          }
        );

        if (response === false) {
          return;
        }

        draftsTable.row(`#${response.uri}`).data(response).draw();
      } else {
        const error = "record not found";

        composeForm.insertAdjacentHTML(
          "beforeend",
          `<div class="alert alert-danger alert-dismissible fade show" role="alert" name="upsertDraftsPageAlert">
                ${error}
                  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>`
        );
      }
    } else {
      // insert
      const draft = { payload: composePayload(parsed) };

      const response = await api(
        composeForm.id,
        201,
        `${window.apiHost}/api/v1/drafts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(draft),
        }
      );

      if (response === false) {
        return;
      }

      const composeUriInput = document.getElementById("composeUriInput");

      composeUriInput.value = response.uri;
      composeUriInput.dispatchEvent(new Event("input"));
      composeUriInput.dispatchEvent(new Event("change"));

      draftsTable.row.add(response);
      draftsTable.draw();
    }
  }
};

export const sendDraft = async (composeForm, uri, parsed) => {
  if (!formIsPopulated) {
    const alert = composeForm.querySelector('div[name="sendDraftsPageAlert"]');
    if (alert) alert.remove();

    if (uri) {
      // update & send
      const index = draftsTable.column(0).data().toArray().indexOf(uri);

      if (index >= 0) {
        const data = draftsTable.row(`#${uri}`).data();
        const draft = { uri, payload: composePayload(parsed) };

        if (data.labelIds) draft.labelIds = data.labelIds;
        if (data.unread) draft.unread = data.unread;
        if (data.starred) draft.starred = data.starred;
        if (data.createdAt) draft.createdAt = data.createdAt;
        if (data.modifiedAt) draft.modifiedAt = data.modifiedAt;

        // test !!!
        // draft.payload.headers["In-Reply-To"] = "<c3494e4a-4d37-478a-b812-c6e4c02d6d80@cargomail.org>";
        // draft.payload.headers["References"] = "<c3494e4a-4d37-478a-b812-c6e4c02d6d80@cargomail.org>";
        // draft.payload.headers["X-Thread-ID"] = "<e722d183-1357-4c6e-838d-5a2f003fdc66@cargomail.org>";

        const response = await api(
          composeForm.id,
          200,
          `${window.apiHost}/api/v1/drafts/send`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(draft),
          }
        );

        if (response === false) {
          return;
        }

        draftsTable.rows(`#${uri}`).remove().draw();
        draftsTable
          .buttons([".drafts-delete"])
          .enable(draftsTable.rows().count() > 0);

        sentTable.row.add(response);
        sentTable.draw();

        try {
          formIsPopulated = true;
          composeClearForm();
        } finally {
          formIsPopulated = false;
        }
      } else {
        const error = "record not found";

        composeForm.insertAdjacentHTML(
          "beforeend",
          `<div class="alert alert-danger alert-dismissible fade show" role="alert" name="sendDraftsPageAlert">
                ${error}
                  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>`
        );
      }
    } else {
      const error = "empty uri";

      composeForm.insertAdjacentHTML(
        "beforeend",
        `<div class="alert alert-danger alert-dismissible fade show" role="alert" name="sendDraftsPageAlert">
              ${error}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`
      );
    }
  }
};
