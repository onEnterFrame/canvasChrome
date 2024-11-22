// API handling module
const api = {
  baseUrl: null,
  currentUser: null,
  dateRange: "",

  async init() {
    // set date range to past 10 school days GET /api/v1/courses/:course_id/assignments?due_after=2024-11-11T00:00:00Z&due_before=2024-11-12T23:59:59Z
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.dateRange = `&due_after=${pastDate.toISOString()}&due_before=${tomorrow.toISOString()}&include[]=submission`;

    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        try {
          const currentTab = tabs[0];
          if (!currentTab) {
            throw new Error("No active tab found");
          }

          const url = new URL(currentTab.url);
          if (!url.hostname.endsWith("instructure.com")) {
            throw new Error("Not on a Canvas page");
          }

          this.baseUrl = `${url.protocol}//${url.hostname}/api/v1`;
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  },

  /**
   * Converts assignments array to markdown format
   * @param {Array} assignments - Array of assignment objects
   * @returns {string} Markdown formatted string
   */
  assignmentsToMarkdown(assignments) {
    if (!Array.isArray(assignments)) return "";

    let markdown = "Assignments:\n";
    let assignmentCount = 0;
    assignments.forEach((assignment) => {
      if (!assignment) return;
      assignmentCount++;
      markdown += `Assignment: ${assignment.name || "Untitled"}\n`;
      markdown += `- Due Date: ${this.formatDate(assignment.dueDate)}\n`;
      markdown += `- Submitted Date: ${this.formatDate(
        assignment.submittedDate
      )}\n`;
      markdown += `- Status: ${assignment.status || "Unknown"}\n`;
      markdown += `- Points Possible: ${assignment.pointsPossible || 0}\n`;
      markdown += `- Score: ${assignment.score ?? "Not graded"}\n`;
      markdown += `- Late: ${assignment.isLate ? "Yes" : "No"}\n`;
      markdown += `- Missing: ${assignment.isMissing ? "Yes" : "No"}\n\n`;
    });

    return markdown;
  },

  /**
   * Formats a date string into a localized date string
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string or 'N/A'
   */
  formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "N/A";
    }
  },

  // api.js
  async generateAISummary(activities, studentName) {
    return new Promise((resolve, reject) => {
      try {
        const assignmentsMd = this.assignmentsToMarkdown(
          activities.filter((a) => a.type === "assignment").slice(0, 10)
        );

        let prompt = `
          ${studentName}'s Progress:
          ${assignmentsMd}
          
          Generate a plan to help me succeed in school. Keep you response simple, short, and direct.
    Please respond in the markdown format using English.
    My name is ${studentName}.

    Explain and provide detail on:
    1. Areas of strength
    2. Areas needing improvement
    3. A simple and direct plan to improve.
    4. Any additional comments or suggestions. 
    5. Websites or videos that could help me improve on specific topics.             
      `;

        if (this.currentUser.role === "ObserverEnrollment") {
          prompt = `
           ${studentName}'s Progress:
          ${assignmentsMd}
        Generate a comprehensive summary of this student's progress:
    Please respond in the markdown format using English.
    The student's name is ${studentName}.

    Explain and provide detail on:
    1. Overall engagement
    2. Assignment completion patterns
    3. Areas of strength
    4. Areas needing improvement 

    `;
        }

        // Create connection port
        const port = chrome.runtime.connect({ name: "ai_stream" });
        let fullResponse = "";

        port.onMessage.addListener((msg) => {
          switch (msg.type) {
            case "chunk":
              // Handle streaming chunk
              fullResponse += msg.content;
              ui.updateAiContent(msg.content);
              // Emit event for UI updates if needed
              document.dispatchEvent(
                new CustomEvent("aiStreamUpdate", {
                  detail: { chunk: msg.content, fullResponse },
                })
              );
              break;

            case "complete":
              resolve(msg.content);
              port.disconnect();
              break;

            case "error":
              reject(new Error(msg.content));
              port.disconnect();
              break;
          }
        });

        // Send the prompt
        port.postMessage({
          type: "GENERATE_AI_SUMMARY",
          prompt: prompt,
        });
      } catch (error) {
        console.error("API AI Summary Error:", error);
        reject(error);
      }
    });
  },

  async fetch(endpoint) {
    if (!this.baseUrl) {
      throw new Error("API not properly initialized");
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 403) {
        return null;
      }

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  stripHtmlTags(html) {
    if (!html) return "";
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },

  //get current user
  async getCurrentUser(courseId) {
    const user = await this.fetch(
      `/courses/${courseId}/enrollments?user_id=self`
    );

    return user[0] || null;
  },

  async getAllStudents() {
    const courses = await this.fetch("/courses");
    if (!courses) return [];

    //use first course id to get current user
    this.currentUser = await this.getCurrentUser(courses[0].id);
    const result = await chrome.runtime.sendMessage({
      type: "CREATE_AI_SESSION",
      role: this.currentUser.role,
    });

    const enrollmentsPromises = courses.map((course) =>
      this.fetch(`/courses/${course.id}/enrollments?type[]=StudentEnrollment`)
    );

    const allEnrollments = await Promise.all(enrollmentsPromises);
    const studentMap = new Map();

    allEnrollments
      .flat()
      .filter(Boolean)
      .forEach((enrollment) => {
        if (
          enrollment?.user &&
          enrollment?.type === "StudentEnrollment" &&
          enrollment?.enrollment_state === "active"
        ) {
          studentMap.set(enrollment.user.id, enrollment.user);
        }
      });

    return Array.from(studentMap.values());
  },

  async getStudentCourses(studentId) {
    const courses = await this.fetch(
      `/users/${studentId}/courses?include[]=total_students&enrollment_state=active`
    );
    return courses?.filter((course) => course.enrollment_term_id) || [];
  },

  async getAssignmentsDueToday(courses) {
    const assignmentsPromises = courses.map((course) =>
      this.fetch(
        `/courses/${course.id}/assignments?per_page=100&include[]=submission`
      )
    );

    const allAssignments = await Promise.all(assignmentsPromises);
    const allAssignmentsDueToday = allAssignments
      .flat()
      .filter((assignment) => {
        if (!assignment.due_at) return false;

        const dueDate = new Date(assignment.due_at);
        const today = new Date();
        const previousSchoolDay = new Date(today);
        const nextSchoolDay = new Date(today);

        // Calculate previous school day (Friday if today is Monday)
        if (today.getDay() === 1) {
          previousSchoolDay.setDate(today.getDate() - 3); // Friday
        } else {
          previousSchoolDay.setDate(today.getDate() - 1);
        }

        // Calculate next school day (Tuesday if today is Monday)
        if (today.getDay() === 5) {
          nextSchoolDay.setDate(today.getDate() + 3); // Monday
        } else {
          nextSchoolDay.setDate(today.getDate() + 1);
        }

        // Reset time components for date comparison
        previousSchoolDay.setHours(0, 0, 0, 0);
        nextSchoolDay.setHours(23, 59, 59, 999);

        return dueDate >= previousSchoolDay && dueDate <= nextSchoolDay;
      })
      .map((assignment) => ({
        title: assignment.name,
        dueDate: this.formatDate(assignment.due_at),
        submissionStatus: assignment.submission ? "Submitted" : "Not submitted",
        isLate: assignment.due_at < new Date(),
        isMissing: !assignment.submission,
        html_url: assignment.html_url,
      }));
    // sort by due date
    allAssignmentsDueToday.sort((a, b) => {
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    return allAssignmentsDueToday;
  },

  async getAssignments(courseId, studentId) {
    // /api/v1/users/:user_id/courses/:course_id/assignments
    const assignments = await this.fetch(
      `/users/${studentId}/courses/${courseId}/assignments?per_page=100&include[]=submission&order_by=due_at`
    );
    return assignments || [];
  },

  async getStudentSubmissions(courseId, studentId) {
    const submissions = await this.fetch(
      `/courses/${courseId}/students/submissions?student_ids[]=${studentId}&include[]=assignment&per_page=100`
    );
    return submissions || [];
  },

  async getStudentSummaryData(courseId, student) {
    try {
      const [assignments, submissions] = await Promise.all([
        this.getAssignments(courseId, student.id),
        this.getStudentSubmissions(courseId, student.id),
      ]);

      const activities = assignments.map((assignment) => {
        const submission = submissions.find(
          (s) => s.assignment_id === assignment.id
        );

        return {
          type: "assignment",
          id: assignment.id,
          name: assignment.name,
          dueDate: assignment.due_at,
          submittedDate: submission?.submitted_at || null,
          score: submission?.score,
          pointsPossible: assignment.points_possible,
          isLate: submission?.late || false,
          isMissing: submission?.missing || false,
          status: submission?.workflow_state || "not_submitted",
          html_url: assignment.html_url,
        };
      });

      // Remove AI summary generation from here
      const summaryData = {
        studentId: student.id,
        courseId,
        activities,
        stats: {
          totalAssignments: assignments.length,
          completedAssignments: activities.filter((a) => a.submittedDate)
            .length,
          lateAssignments: activities.filter((a) => a.isLate).length,
          missingAssignments: activities.filter((a) => a.isMissing).length,
        },
      };

      // Start AI summary generation in background
      this.generateAISummary(activities, student.name)
        .then((aiSummary) => {
          // console.log("AI Summary done generated:", aiSummary);
        })
        .catch((error) => {
          console.error("Error generating AI Summary:", error);
        });

      return summaryData;
    } catch (error) {
      console.error("Error generating summary data:", error);
      throw error;
    }
  },
};
