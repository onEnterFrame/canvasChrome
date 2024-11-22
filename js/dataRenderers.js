// Data rendering module
const dataRenderers = {
  // Renders a dropdown list of students or displays the student's name if there is only one student
  renderStudents(students) {
    const studentsList = ui.elements.studentsList();
    studentsList.innerHTML = "";

    if (students.length === 1) {
      // If there is only one student, display their name directly
      const studentName = document.createElement("div");
      studentName.className = "student-name";
      studentName.textContent = students[0].name;
      studentsList.appendChild(studentName);

      // Load the student's courses automatically
      app.loadStudentCourses(students[0]);
    } else {
      // If there are multiple students, create a dropdown list
      const select = document.createElement("select");
      select.className = "student-select";

      // Style the select element
      select.style.cssText = `
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        background-color: white;
        font-size: 0.9rem;
        color: #2d3b45;
        cursor: pointer;
        transition: border-color 0.2s;
      `;

      // Add default option
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Select a student...";
      defaultOption.selected = true;
      defaultOption.disabled = true;
      select.appendChild(defaultOption);

      // Add options for each student
      students.forEach((student) => {
        const option = document.createElement("option");
        option.value = student.id;
        option.textContent = student.name;
        option.dataset.student = JSON.stringify(student);
        select.appendChild(option);
      });

      // Add change handler to load student courses when a student is selected
      select.onchange = (e) => {
        const selectedStudent = JSON.parse(
          e.target.selectedOptions[0].dataset.student
        );
        app.loadStudentCourses(selectedStudent);
      };

      studentsList.appendChild(select);
    }
  },
  // Renders a list of courses
  renderCourses(courses) {
    ui.clearList("coursesList");
    courses.forEach((course) => {
      const content = `
        <div class="course-name" data-course-id="${course.id}">${course.name}</div>
      `;
      const element = ui.createDataItem(content);
      element.onclick = () => app.loadCourseDetails(course);
      ui.elements.coursesList().appendChild(element);
    });
  },

  // Formats a date string into a readable date format
  formatDate(dateString) {
    if (!dateString) return "No date";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return "Invalid date";
    }
  },

  // Renders a list of assignments with their status
  renderAssignments(activities) {
    ui.clearList("assignmentsList");
    activities.forEach((activity) => {
      if (activity.type !== "assignment") return;

      let statusClass = "";
      let statusText = "";
      let statusIcon = "";
      console.log(activity);
      // Determine the status of the assignment
      if (activity.submittedDate) {
        statusText = `Submitted: ${this.formatDate(activity.submittedDate)}`;
        statusIcon =
          '<div class="assignment-icon status-submitted">&#x2705;</div>';
        if (activity.isLate) {
          statusText += " (Late)";
          statusClass = "overdue";
          statusIcon =
            '<div class="assignment-icon status-late">&#x23F0;</div>';
        }
      } else {
        statusText = "Not submitted";
        if (activity.dueDate && new Date(activity.dueDate) < new Date()) {
          statusClass = "overdue";
          statusIcon =
            '<div class="assignment-icon status-overdue">&#x2757;</div>';
        } else {
          statusIcon =
            '<div class="assignment-icon status-upcoming">&#x1F4C5;</div>';
        }
      }

      // Determine the score text if available
      const scoreText =
        activity.score !== undefined && activity.score !== null
          ? `<br>Score: ${activity.score}/${activity.pointsPossible}`
          : "";

      // Create the content for the assignment item
      const content = `
        <div class="row">
          ${statusIcon}
          <div class="assignment-name">${activity.name}</div>
          <div class="assignment-due-date">Due: ${this.formatDate(
            activity.dueDate
          )}</div>
          <div class="assignment-submission ${statusClass}">
            ${statusText}
            ${scoreText ? `${scoreText}` : ""}
          </div>
        </div>
      `;

      const element = ui.createDataItem(content);

      // Add click handler to open the assignment URL if available
      if (activity.html_url) {
        element.onclick = () => {
          chrome.tabs.update({ url: activity.html_url });
        };
        element.classList.add("clickable");
      }

      ui.elements.assignmentsList().appendChild(element);
    });
  },

  // Renders a summary panel with statistics and AI analysis content
  renderSummary(summaryData) {
    const summaryPanel = document.createElement("div");
    // summaryPanel.className = "summary-panel";

    summaryPanel.innerHTML = `
        <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Total Assignments</div>
          <div class="summary-value">${summaryData.stats.totalAssignments}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Completed Assignments</div>
          <div class="summary-value ${
            summaryData.stats.completedAssignments ===
            summaryData.stats.totalAssignments
              ? "success"
              : ""
          }">${summaryData.stats.completedAssignments}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Late Assignments</div>
          <div class="summary-value ${
            summaryData.stats.lateAssignments > 0 ? "warning" : ""
          }">${summaryData.stats.lateAssignments}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Missing Assignments</div>
          <div class="summary-value ${
            summaryData.stats.missingAssignments > 0 ? "warning" : ""
          }">${summaryData.stats.missingAssignments}</div>
        </div>

      </div>
        <div class="ai-summary">
          <p>AI Analysis of recent progress.</p>
          <div id="aiContent" class="ai-content">Loading AI summary...</div>
        </div>
    `;
    return summaryPanel;
  },
};
