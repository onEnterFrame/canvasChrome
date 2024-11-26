# Canvas Helper Extension

A Chrome extension that helps students and observers track assignments and progress in Canvas LMS.

## Features

- View student assignments and course data
- Track due dates and submission status
- Generate AI-powered progress summaries
- Navigate between courses and assignments
- View detailed statistics and analytics

## Project Structure

├── background.js # Chrome extension background worker
├── content.js # Page content script
├── css/
│ └── styles.css # Main stylesheet
├── icons/ # Extension icons
├── js/
│ ├── api.js # Canvas API interactions
│ ├── app.js # Main application logic
│ ├── content.js # Content script logic
│ ├── dataRenderers.js # Data rendering utilities
│ ├── init.js # Initialization code
│ ├── ui.js # UI handling
│ └── utils.js # Utility functions
├── libs/
│ └── marked.js # Markdown parser
├── manifest.json # Extension manifest
└── popup.html # Extension popup interface

## Installation

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project directory

## Usage

1. Click the extension icon in Chrome
2. Select a student (if you're an observer)
3. View assignments and course data
4. Navigate using the tabs:
   - Due Now
   - Courses & Assignments
   - Summary

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
