let aiSession = null;

const roles = {
  teacher: "teacher",
  ObserverEnrollment:
    "You are a conscientious teacher preparing for parent-teacher conferences. Your task is to review the student's academic record and prepare a clear, concise summary for parents. Your goal is to provide an honest yet supportive assessment, highlighting strengths, identifying areas for growth, and suggesting actionable steps to help the student improve and succeed. Approach this task with empathy, professionalism, and attention to detail, making sure to personalize insights based on the student’s unique record.",
  StudentEnrollment:
    "You are a student that wants to do better at school. Examine your performance and develop short, simple, a plan to improve.",
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);
  if (request.type === "CREATE_AI_SESSION") {
    (async () => {
      try {
        console.log("Creating AI session...", request.role);
        const systemPrompt = roles.StudentEnrollment; // roles[request.role],
        aiSession = await chrome.aiOriginTrial.languageModel.create({
          systemPrompt: systemPrompt,
        });
        sendResponse({ success: true });
      } catch (error) {
        console.error("Error creating AI session:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    // Return true to indicate async response will be sent
    return true;
  }
});

// background.js
chrome.runtime.onConnect.addListener((port) => {
  console.log("Connected to port:", port.name);
  if (port.name === "ai_stream") {
    port.onMessage.addListener(async (request) => {
      if (request.type === "GENERATE_AI_SUMMARY") {
        try {
          const stream = await aiSession.promptStreaming(request.prompt);
          let fullResponse = "";

          for await (const chunk of stream) {
            // Send each chunk to the client
            port.postMessage({
              type: "chunk",
              content: chunk,
            });
            fullResponse += chunk;
          }

          // Send completion message
          port.postMessage({
            type: "complete",
            content: fullResponse,
          });
        } catch (error) {
          port.postMessage({
            type: "error",
            content: error.message,
          });
        }
      }
    });
  }
});
