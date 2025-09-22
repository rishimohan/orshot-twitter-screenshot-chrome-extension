// Background service worker for handling API requests
console.log("Background script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);

  if (request.action === "generateScreenshot") {
    handleScreenshotRequest(request, sendResponse);
    return true; // Will respond asynchronously
  }
});

async function handleScreenshotRequest(request, sendResponse) {
  console.log("Handling screenshot request for:", request.tweetUrl);

  try {
    const response = await fetch(
      "https://orshot.com/api/templates/make-playground-request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateSlug: "tweet-image",
          modifications: {
            tweetUrl: request.tweetUrl,
            showRepliedToTweet: true,
          },
          userAPIKey: request.apiKey,
          responseType: "base64",
          responseFormat: "png",
          renderType: "images",
          source: "orshot-tweet-chrome-extension",
        }),
      }
    );

    console.log("API response status:", response.status);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate screenshot");
    }

    if (!data.data?.content) {
      throw new Error("No image data received");
    }

    console.log("Screenshot generated successfully");
    sendResponse({
      success: true,
      data: data.data.content,
    });
  } catch (error) {
    console.error("Background script error:", error);
    sendResponse({
      success: false,
      error: error.message || "Failed to generate screenshot",
    });
  }
}
