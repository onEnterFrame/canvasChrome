// Utility functions
export const utils = {
  truncateText(text, maxLength = 200) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
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

  /**
   * Converts assignments array to markdown format
   * @param {Array} assignments - Array of assignment objects
   * @returns {string} Markdown formatted string
   */
  assignmentsToMarkdown(assignments) {
    if (!Array.isArray(assignments)) return "";

    let markdown = "# Assignments\n\n";

    assignments.forEach((assignment) => {
      if (!assignment) return;

      markdown += `## [${assignment.name || "Untitled"}]\n`;
      markdown += `- **Due Date**: ${this.formatDate(assignment.dueDate)}\n`;
      markdown += `- **Submitted Date**: ${this.formatDate(
        assignment.submittedDate
      )}\n`;
      markdown += `- **Status**: ${assignment.status || "Unknown"}\n`;
      markdown += `- **Points Possible**: ${assignment.pointsPossible || 0}\n`;
      markdown += `- **Score**: ${assignment.score ?? "Not graded"}\n`;
      markdown += `- **Late**: ${assignment.isLate ? "Yes" : "No"}\n`;
      markdown += `- **Missing**: ${assignment.isMissing ? "Yes" : "No"}\n\n`;
    });

    return markdown;
  },
};
