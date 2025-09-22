// Popup script for managing extension settings
document.addEventListener("DOMContentLoaded", async () => {
  const apiKeyInput = document.getElementById("apiKey");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");
  const form = document.getElementById("settingsForm");

  // Load existing settings
  try {
    const result = await chrome.storage.sync.get(["orshotApiKey"]);
    if (result.orshotApiKey) {
      apiKeyInput.value = result.orshotApiKey;
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const apiKey = apiKeyInput.value.trim();

    // Show loading state
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    hideStatus();

    try {
      // Save to chrome storage
      await chrome.storage.sync.set({
        orshotApiKey: apiKey,
      });

      showStatus("Settings saved successfully!", "success");
      saveBtn.textContent = "Save Settings";

      // Notify content scripts of the update
      try {
        const tabs = await chrome.tabs.query({
          url: ["https://twitter.com/*", "https://x.com/*"],
        });

        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              type: "SETTINGS_UPDATED",
              apiKey: apiKey,
            })
            .catch(() => {
              // Ignore errors for tabs that don't have the content script
            });
        });
      } catch (error) {
        // Ignore tab messaging errors
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      showStatus("Failed to save settings. Please try again.", "error");
      saveBtn.textContent = "Save Settings";
    } finally {
      saveBtn.disabled = false;
    }
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = "block";

    // Auto-hide success messages
    if (type === "success") {
      setTimeout(hideStatus, 3000);
    }
  }

  function hideStatus() {
    status.style.display = "none";
  }
});
