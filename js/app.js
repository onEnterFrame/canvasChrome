// Main application module
const app = {
  currentStudentId: null,
  currentCourseId: null,
  currentSummaryData: null,
  currentStudent: null,
  currentUser: null,

  async init() {
    try {
      await api.init();
      ui.initializeTabs(); // Initialize tabs
      await this.loadStudents();
    } catch (error) {
      if (error.message.includes("Not on a Canvas page")) {
        ui.showDomainError();
      } else {
        ui.showError(error.message || "Failed to initialize application");
        console.error("Initialization error:", error);
      }
    }
  },

  async loadStudents() {
    ui.showLoading();
    try {
      const students = await api.getAllStudents();
      dataRenderers.renderStudents(students);
      // if there is only one student, load their courses automatically
      if (students.length === 1) {
        this.loadStudentCourses(students[0]);
      }
      ui.clearList("coursesList");
      ui.clearList("assignmentsList");
      //ui.clearList("summaryContainer");
    } catch (error) {
      ui.showError("Failed to load students");
      console.error("Load students error:", error);
    } finally {
      ui.hideLoading();
    }
  },

  async loadStudentCourses(student) {
    this.currentStudentId = student.id;
    this.currentStudent = student;
    ui.showLoading();

    try {
      const courses = await api.getStudentCourses(student.id);
      dataRenderers.renderCourses(courses);
      ui.clearList("assignmentsList");
      //ui.clearList("summaryContainer");
      const dueToday = await api.getAssignmentsDueToday(courses);
      if (dueToday.length > 0) {
        ui.renderDueNow(dueToday);
      }
    } catch (error) {
      ui.showError("Failed to load student courses");
      console.error("Load courses error:", error);
    } finally {
      ui.hideLoading();
    }
  },

  async loadCourseDetails(course) {
    this.currentCourseId = course.id;
    ui.showLoading();
    // Remove active class from previously selected course
    const previousActiveCourse = document.querySelector(".course-name.active");
    if (previousActiveCourse) {
      previousActiveCourse.classList.remove("active");
      previousActiveCourse.parentElement.classList.remove("active-parent");
    }

    // Add active class to the selected course
    const selectedCourseElement = document.querySelector(
      `.course-name[data-course-id="${course.id}"]`
    );
    if (selectedCourseElement) {
      selectedCourseElement.classList.add("active");
      selectedCourseElement.parentElement.classList.add("active-parent");
    }

    try {
      // if this.currentUser is null, get the current user
      if (!this.currentUser) {
        this.currentUser = await api.getCurrentUser(this.currentCourseId);
      }
      const summaryData = await api.getStudentSummaryData(
        this.currentCourseId,
        this.currentStudent
      );
      this.currentSummaryData = summaryData;

      dataRenderers.renderAssignments(summaryData.activities);
      // Get the course title
      const courseTitle = course ? course.name : "Unknown Course";
      this.showSummary(courseTitle);
    } catch (error) {
      ui.showError("Failed to load course details");
      console.error("Load course details error:", error);
    } finally {
      ui.hideLoading();
    }
  },

  showSummary(courseTitle) {
    const summaryContainer = ui.elements.summaryContainer();
    summaryContainer.innerHTML = "";
    if (this.currentSummaryData) {
      const summaryPanel = dataRenderers.renderSummary(this.currentSummaryData);
      const titleElement = document.createElement("h2");
      titleElement.textContent = `${courseTitle} Summary: `;
      summaryContainer.appendChild(titleElement);
      summaryContainer.appendChild(summaryPanel);
      //hide elements with .no-course class
      const noCourseElements = document.querySelectorAll(".no-course");
      noCourseElements.forEach((element) => {
        element.style.display = "none";
      });
    }
  },

  resetSummary() {
    const summaryContainer = ui.elements.summaryContainer();
    summaryContainer.innerHTML = "";
    this.currentSummaryData = null;
  },
};
