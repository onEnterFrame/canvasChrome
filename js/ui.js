// UI handling module
const ui = {
  elements: {
    coursesList: () => document.getElementById("coursesList"),
    studentsList: () => document.getElementById("studentsList"),
    assignmentsList: () => document.getElementById("assignmentsList"),
    dueNowList: () => document.getElementById("dueNowList"),
    summaryContainer: () => document.getElementById("summaryContainer"),
    expandButton: () => document.getElementById("expandButton"),
    dueNowTab: () => document.getElementById("dueNowTab"),
    coursesTab: () => document.getElementById("coursesTab"),
    summaryTab: () => document.getElementById("summaryTab"),
    dueNowContent: () => document.getElementById("dueNow"),
    coursesContent: () => document.getElementById("coursesAndAssignments"),
    header: () => document.getElementById("header"),
  },

  constructor() {},
  // Add tab switching
  switchTab(tabId) {
    // Hide all content
    this.elements.dueNowContent().style.display = "none";
    this.elements.coursesContent().style.display = "none";
    this.elements.summaryContainer().style.display = "none";

    // Remove active class from all tabs
    this.elements.dueNowTab().classList.remove("active");
    this.elements.coursesTab().classList.remove("active");
    this.elements.summaryTab().classList.remove("active");

    // Show selected content and activate tab
    switch (tabId) {
      case "dueNow":
        this.elements.dueNowContent().style.display = "block";
        this.elements.dueNowTab().classList.add("active");
        break;
      case "courses":
        this.elements.coursesContent().style.display = "block";
        this.elements.coursesTab().classList.add("active");
        break;
      case "summary":
        this.elements.summaryContainer().style.display = "block";
        this.elements.summaryTab().classList.add("active");
        break;
    }
  },

  initializeTabs() {
    // Set initial state
    this.switchTab("dueNow");

    // Add click handlers
    this.elements.dueNowTab().onclick = () => this.switchTab("dueNow");
    this.elements.coursesTab().onclick = () => this.switchTab("courses");
    this.elements.summaryTab().onclick = () => this.switchTab("summary");
  },

  updateSummaryPanel(summaryPanel) {
    const container = document.querySelector(".summary-panel");
    if (container) {
      container.replaceWith(summaryPanel);
    }
  },

  updateAiContent(content) {
    const aiContent = document.getElementById("aiContent");
    if (aiContent) {
      aiContent.innerHTML = marked.parse(content);
    }
  },

  renderDueNow(dueNow) {
    this.clearList("dueNowList");
    dueNow.forEach((assignment) => {
      const content = `
        <div class="assignment
          ${assignment.isLate ? "late" : ""}
          ${assignment.isMissing ? "missing" : ""}">
          <div class="assignment-title">${assignment.title}</div>
          <div class="assignment-info">
            <span class="assignment-due-date">Due: ${assignment.dueDate}</span>
            <span class="assignment-submission">${
              assignment.submissionStatus
            }</span>
          </div>
        </div>
      `;
      const element = this.createDataItem(content);
      if (assignment.html_url) {
        element.onclick = () => {
          chrome.tabs.update({ url: assignment.html_url });
        };
        element.classList.add("clickable");
      }
      this.elements.dueNowList().appendChild(element);
    });
  },

  showLoading() {
    //if no header wait for it to load
    if (!this.elements.header()) {
      setTimeout(() => {
        this.showLoading();
      }, 200);
      return;
    }
    this.elements.header().classList.add("loading");
  },

  hideLoading() {
    this.elements.header().classList.remove("loading");
  },

  createDataItem(content) {
    const div = document.createElement("div");
    div.className = "data-item";
    div.innerHTML = content;
    return div;
  },

  showError(message) {
    const error = document.createElement("div");
    error.className = "error";
    error.textContent = message;
    document.querySelector(".error").prepend(error);
    document.querySelector(".error").classList.remove("hidden");
    setTimeout(() => {
      error.remove();
      document.querySelector(".error").classList.add("hidden");
    }, 5000);
  },

  clearList(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.innerHTML = "";
  },

  showDomainError() {
    this.showError("Please visit a supported domain to use this extension.");
  },
};
