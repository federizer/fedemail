import DataTable from "datatables.net";

import $ from "jquery";

import "datatables.net-bs5";
import "datatables.net-select";
import "datatables.net-select-bs5";
import "datatables.net-buttons";
import "datatables.net-buttons-bs5";
import "datatables.net-responsive";
import "datatables.net-responsive-bs5";

import {
  parsePayload,
  composePayload,
  createSubjectSnippet,
  createPlainContentSnippet,
} from "/public/js/utils.js";

const getMessages = async () => {
  const response = await api(
    sentFormAlert.id,
    200,
    `${window.apiHost}/api/v1/messages/list`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ folder: 0 }),
    }
  );

  if (response === false) {
    return;
  }

  return response;
};

export const createThreadTable = (row) => {
  // This is the table we'll convert into a DataTable
  const table = $(
    '<table class="table thread-table table-bordered table-hover" width="100%"/>'
  );

  // Display it the child row
  row.child(table).show();

  const rowData = row.data();

  if (!rowData?.messages) {
    console.log("no data");
    return;
  }

  // Initialise as a DataTable
  const threadsTable = table.DataTable({
    info: false,
    paging: false,
    searching: false,
    ordering: true,
    responsive: {
      details: false,
    },
    dom: "Bfrtip",
    pageLength: 50,
    rowId: "id",
    data: rowData.messages,
    columns: [
      { data: "id", visible: false, searchable: false },
      {
        data: "payload",
        className: "threads-payload",
        orderable: false,
        render: (data, type, full, meta) => {
          const parsed = parsePayload(full.id, full.payload);

          const link = `${window.apiHost}/api/v1/files/`;
          const attachmentLinks = [];

          for (const attachment of parsed.attachments) {
            const attachmentAnchor = `<a class="attachmentLink" href="javascript:;" onclick="downloadId('sentFormAlert', '${link}${attachment.digest}', '${attachment.fileName}');">${attachment.fileName}</a>`;
            attachmentLinks.push(attachmentAnchor);
          }

          const plainContent =
            type === "display"
              ? createPlainContentSnippet(parsed.plainContent)
              : parsed.plainContent;

          let content;

          if (plainContent) {
            content = plainContent;
          }

          let renderHtml = `<div"><span>${content || "Message"}</span>`;
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
          return full.createdAt;
        },
      },
    ],
    order: [[2, "asc"]],
  });

  let headerTitle = "";

  if (rowData.messages.length > 0) {
    const parsed = parsePayload(
      rowData.messages[0].id,
      rowData.messages[0].payload
    );
    headerTitle = createSubjectSnippet(parsed.subject);
  }

  if (!headerTitle) {
    headerTitle = "(no subject)";
  }

  const header = threadsTable.columns(1).header();
  $(header).html(headerTitle);

  threadsTable.on("click", "td.threads-payload", (e) => {
    if (e.target.classList.contains("attachmentLink")) {
      return;
    }
  
    console.log(e.target);
  
    /*let tr = e.target.closest("tr");
    let row = sentTable.row(tr);
    // let rowData = row.data();
  
    if (row.child.isShown()) {
      // This row is already open - close it
      // row.child.hide();
      destroyThreadTable(row);
      tr.classList.remove("shown");
    } else {
      // if (sentTable.row(".shown").length)
      //   $(".payload", sentTable.row(".shown").node()).click();
      // Open this row
      // row.child(conversationPane(rowData)).show();
      createThreadTable(row);
      tr.classList.add("shown");
    }*/
  });
};

export const destroyThreadTable = (row) => {
  const table = $("table", row.child());
  table.detach();
  table.DataTable().destroy();

  // And then hide the row
  row.child.hide();
};

export const messageListResponse = await getMessages();
