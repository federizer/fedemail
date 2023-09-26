import DataTable from "datatables.net";

// import $ from 'jquery';

import "datatables.net-bs5";
import "datatables.net-select";
import "datatables.net-select-bs5";
import "datatables.net-buttons";
import "datatables.net-buttons-bs5";
import "datatables.net-responsive";
import "datatables.net-responsive-bs5";

import { sentTable } from "/public/js/sent.js";
import {
  parsePayload,
  composePayload,
  createSubjectSnippet,
  createPlainContentSnippet,
} from "/public/js/utils.js";

import { composeContentPage } from "/public/js/menu.js";
import {
  clearForm as composeClearForm,
  populateForm as composePopulateForm,
} from "/public/js/compose.js";

let selectedIds = [];

const draftsConfirmDialog = new bootstrap.Modal(
  document.querySelector("#draftsConfirmDialog")
);

const draftsFormAlert = document.getElementById("draftsFormAlert");

const composeIdInput = document.getElementById("composeIdInput");

let formIsPopulated = false;

let historyId = 0;

const draftsTable = new DataTable("#draftsTable", {
  paging: true,
  responsive: {
    details: false,
  },
  rowCallback: function (row, data, dataIndex) {
    const $row = $(row);
    if ($row.hasClass("even")) {
      $row.css("background-color", "rgb(245,245,245)");
      $row.hover(
        function () {
          $(this).css("background-color", "rgb(226 232 240)");
        },
        function () {
          $(this).css("background-color", "rgb(245,245,245)");
        }
      );
    } else {
      $row.css("background-color", "rgb(245,245,245)");
      $row.hover(
        function () {
          $(this).css("background-color", "rgb(226 232 240)");
        },
        function () {
          $(this).css("background-color", "rgb(245,245,245)");
        }
      );
    }
  },
  // createdRow: function (row, data, dataIndex) {
  //   if (dataIndex%2 == 0) {
  //     $(row).attr('style', 'background-color: yellow;');
  //   } else {
  //     $(row).attr('style', 'background-color: yellow;');
  //   }
  // },
  // stripeClasses: [],
  // drawCallback: function () {
  //   // $(this.api().table().header()).hide();
  //   $("#selector thead").remove();
  // },
  ajax: function (data, callback, settings) {
    (async () => {
      const response = await api(
        draftsFormAlert.id,
        200,
        `${window.apiHost}/api/v1/drafts/list`,
        {
          method: "POST",
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
    { data: "id", visible: false, searchable: false },
    { data: null, visible: true, orderable: false },
    {
      data: "payload",
      className: "payload",
      orderable: false,
      render: (data, type, full, meta) => {
        const parsed = parsePayload(full.id, full.payload);

        const link = `${window.apiHost}/api/v1/files/`;
        const attachmentLinks = [];

        for (const attachment of parsed.attachments) {
          const attachmentAnchor = `<a class="attachmentLink" href="javascript:;" onclick="downloadId('draftsFormAlert', '${link}${attachment.digest}', '${attachment.fileName}');">${attachment.fileName}</a>`;
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

        let renderHtml = `<div"><span>${content || "Draft"}</span>`;
        if (attachmentLinks.length > 0) {
          renderHtml += `<br/>`;
          for (const item of attachmentLinks) {
            renderHtml += `<span>${item}  </span>`;
          }
        }
        renderHtml += "</div>";

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
  rowId: "id",
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
    [5, 10, 15, 25],
    [5, 10, 15, 25],
  ],
  pageLength:
    $(document).height() >= 700 ? ($(document).height() >= 900 ? 15 : 10) : 5,
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

          draftsTableRefresh(response);
        })();
      },
    },
    {
      text: "Delete",
      className: "drafts-delete",
      enabled: false,
      action: function () {
        selectedIds = [];

        const selectedData = draftsTable
          .rows(".selected")
          .data()
          .map((obj) => obj.id);
        if (selectedData.length > 0) {
          draftsConfirmDialog.show();
          for (let i = 0; i < selectedData.length; i++) {
            selectedIds.push(selectedData[i]);
          }
        }
      },
    },
  ],
});

$(window).resize(function () {
  if ($(this).height() >= "700") {
    if ($(this).height() >= "900") {
      draftsTable.page.len(15).draw();
    } else {
      draftsTable.page.len(10).draw();
    }
  } else {
    draftsTable.page.len(5).draw();
  }
});

draftsTable.on("click", "td.payload", (e) => {
  if (e.target.classList.contains("attachmentLink")) {
    return;
  }

  const data = draftsTable.row(e.currentTarget).data();
  const parsed = parsePayload(data.id, data.payload);

  try {
    formIsPopulated = true;
    composePopulateForm(false, data.id, data.attachments, parsed);
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

export const draftsTableRefresh = (data) => {
  historyId = data.lastHistoryId;

  for (const draft of data.inserted) {
    // https://datatables.net/forums/discussion/59343/duplicate-data-in-the-data-table
    const notFound =
      draftsTable.column(0).data().toArray().indexOf(draft.id) === -1; // !!! must be
    if (notFound) {
      draftsTable.row.add(draft);
    }
  }

  for (const draft of data.updated) {
    // https://datatables.net/forums/discussion/59343/duplicate-data-in-the-data-table
    const notFound =
      draftsTable.column(0).data().toArray().indexOf(draft.id) === -1; // !!! must be
    if (notFound) {
      draftsTable.row.add(draft);
    } else {
      draftsTable.row(`#${draft.id}`).data(draft);

      if (draft.id == composeIdInput.value) {
        try {
          const parsed = parsePayload(draft.id, draft.payload);

          formIsPopulated = true;
          composePopulateForm(false, draft.id, parsed);
        } finally {
          formIsPopulated = false;
        }
      }
    }
  }

  for (const draft of data.trashed) {
    draftsTable.row(`#${draft.id}`).remove();

    if (draft.id == composeIdInput.value) {
      try {
        formIsPopulated = true;
        composeClearForm();
      } finally {
        formIsPopulated = false;
      }
    }
  }

  for (const draft of data.deleted) {
    draftsTable.row(`#${draft.id}`).remove();

    if (draft.id == composeIdInput.value) {
      try {
        formIsPopulated = true;
        composeClearForm();
      } finally {
        formIsPopulated = false;
      }
    }
  }

  draftsTable.draw();
};

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
        body: JSON.stringify({ ids: selectedIds }),
      }
    );

    if (response === false) {
      return;
    }

    if (selectedIds.includes(composeIdInput.value)) {
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

export const deleteDraft = async (composeForm, id) => {
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
      body: JSON.stringify({ ids: [id] }),
    }
  );

  if (response === false) {
    return;
  }

  draftsTable.rows(`#${id}`).remove().draw();
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

export const upsertDraftsPage = async (composeForm, id, attachments, parsed) => {
  if (!formIsPopulated) {
    const alert = composeForm.querySelector(
      'div[name="upsertDraftsPageAlert"]'
    );
    if (alert) alert.remove();

    if (id) {
      // update
      const index = draftsTable.column(0).data().toArray().indexOf(id);

      if (index >= 0) {
        const data = draftsTable.row(`#${id}`).data();
        const draft = { id, attachments, payload: composePayload(parsed) };

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

        draftsTable.row(`#${response.id}`).data(response).draw();
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
      const draft = { attachments, payload: composePayload(parsed) };

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

      const composeIdInput = document.getElementById("composeIdInput");

      composeIdInput.value = response.id;
      composeIdInput.dispatchEvent(new Event("input"));
      composeIdInput.dispatchEvent(new Event("change"));

      draftsTable.row.add(response);
      draftsTable.draw();
    }
  }
};

export const sendDraft = async (composeForm, id, attachments, parsed) => {
  if (!formIsPopulated) {
    const alert = composeForm.querySelector('div[name="sendDraftsPageAlert"]');
    if (alert) alert.remove();

    if (id) {
      // update & send
      const index = draftsTable.column(0).data().toArray().indexOf(id);

      if (index >= 0) {
        const data = draftsTable.row(`#${id}`).data();
        const draft = { id, attachments, payload: composePayload(parsed) };

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

        draftsTable.rows(`#${id}`).remove().draw();
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
      const error = "empty id";

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
