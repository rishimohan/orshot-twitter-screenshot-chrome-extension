// Content script for adding capture buttons to tweets
class OrshotTweetCapture {
  constructor() {
    this.apiKey = null;
    this.loadSettings();
    this.init();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(["orshotApiKey"]);
      this.apiKey = result.orshotApiKey || null;
    } catch (error) {
      console.log("No API key stored");
    }
  }

  init() {
    // Listen for settings updates from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "SETTINGS_UPDATED") {
        this.apiKey = message.apiKey;
      }
    });

    // Wait for page to load and then start observing
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.startObserving(),
      );
    } else {
      this.startObserving();
    }
  }

  startObserving() {
    // Add buttons to existing tweets
    this.addCaptureButtons();

    // Watch for new tweets being loaded (infinite scroll)
    const observer = new MutationObserver((mutations) => {
      let shouldAddButtons = false;
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          shouldAddButtons = true;
        }
      });

      if (shouldAddButtons) {
        // Debounce to avoid too many calls
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.addCaptureButtons();
        }, 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  addCaptureButtons() {
    // Find all tweet articles that don't already have a capture button
    const tweets = document.querySelectorAll(
      'article[data-testid="tweet"]:not([data-orshot-processed])',
    );

    tweets.forEach((tweet) => {
      this.addCaptureButtonToTweet(tweet);
      tweet.setAttribute("data-orshot-processed", "true");
    });
  }

  addCaptureButtonToTweet(tweetElement) {
    // Check if we're on an individual tweet page
    const isIndividualTweetPage = window.location.href.includes("/status/");

    if (isIndividualTweetPage) {
      // On individual tweet pages, add button next to views
      this.addCaptureButtonToIndividualTweet(tweetElement);
    } else {
      // On timeline, add button to action bar
      this.addCaptureButtonToTimeline(tweetElement);
    }
  }

  addCaptureButtonToTimeline(tweetElement) {
    // Find the action bar (like, retweet, share buttons)
    const actionBar = tweetElement.querySelector('[role="group"]');
    if (!actionBar) return;

    // Create capture button
    const captureButton = this.createCaptureButton();

    // Add click handler
    captureButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.captureTweet(tweetElement);
    });

    // Find a reference button (Share or Reply) to borrow styles from
    const shareButton = actionBar.querySelector(
      '[data-testid="share"], [aria-label="Share"]',
    );
    const replyButton = actionBar.querySelector('[data-testid="reply"]');
    const referenceBtn = shareButton || replyButton;

    if (referenceBtn) {
      const refStyle = window.getComputedStyle(referenceBtn);

      // 1. Fix Layout Shift: Match dimensions exactly
      if (refStyle.height && refStyle.height !== "auto") {
        captureButton.style.height = refStyle.height;
        captureButton.style.minHeight = refStyle.minHeight;
        // Make sure it doesn't overflow or stretch
        captureButton.style.maxHeight = refStyle.maxHeight;
      }

      // Match margins to align baseline
      captureButton.style.marginTop = refStyle.marginTop;
      captureButton.style.marginBottom = refStyle.marginBottom;

      // 2. Fix Color: Apply specific gray color based on theme
      // Twitter icons use specialized colors that don't always map to text color
      // Light mode icon: #536471, Dark mode icon: #71767B

      // Basic darkness check
      const isDark =
        document.body.style.backgroundColor === "rgb(0, 0, 0)" ||
        document.body.style.backgroundColor === "rgb(21, 32, 43)" ||
        window.getComputedStyle(document.body).backgroundColor !==
          "rgb(255, 255, 255)";

      if (isDark) {
        captureButton.style.color = "#71767B";
      } else {
        captureButton.style.color = "#536471";
      }
    }

    // Insert the button into the action bar
    // We append it to the end for the timeline view
    actionBar.appendChild(captureButton);
  }

  addCaptureButtonToIndividualTweet(tweetElement) {
    // Try to find the action bar by looking for the Like or Reply button container
    // This helps avoid matching other groups (like media containers) that might appear before the action bar
    let actionBar = null;
    const likeButton = tweetElement.querySelector(
      '[data-testid="like"], [data-testid="unlike"]',
    );
    const replyButton = tweetElement.querySelector('[data-testid="reply"]');

    const actionButton = likeButton || replyButton;

    if (actionButton) {
      // The action bar is usually the closest group container
      actionBar = actionButton.closest('[role="group"]');
    }

    // Fallback if we couldn't find via buttons
    if (!actionBar) {
      actionBar = tweetElement.querySelector('[role="group"]');
    }

    if (!actionBar) return;

    // Check if button already exists here
    if (actionBar.querySelector(".orshot-capture-btn")) return;

    // Create standard capture button (not compact) to match other icons
    const captureButton = this.createCaptureButton();

    // Add click handler
    captureButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.captureTweet(tweetElement);
    });

    // Find the share button to insert before
    const shareButton = actionBar.querySelector(
      '[aria-label="Share"], [aria-label="Share post"], [data-testid="share"]',
    );

    if (shareButton) {
      // The share button might be nested deep inside (e.g. inside a div inside the action bar)
      // We want to insert our button as a direct child of the action bar,
      // immediately before the element that contains the share button.
      let targetElement = shareButton;

      // Traverse up until we find the element that is a direct child of actionBar
      while (targetElement && targetElement.parentElement !== actionBar) {
        targetElement = targetElement.parentElement;
      }

      if (targetElement) {
        try {
          // Copy styles to match native look and prevent layout shift
          const targetStyle = window.getComputedStyle(targetElement);
          const shareBtnStyle = window.getComputedStyle(shareButton);

          // Fix layout shift by matching height and margins of the container
          // Using minHeight as well ensures we don't collapse if specific height is 'auto'
          if (targetStyle.height && targetStyle.height !== "auto") {
            captureButton.style.height = targetStyle.height;
            captureButton.style.minHeight = targetStyle.minHeight;
            // Also match width to ensure it's a perfect circle like native icons
            captureButton.style.width =
              targetStyle.width !== "auto"
                ? targetStyle.width
                : targetStyle.height;
          }

          captureButton.style.marginBottom = targetStyle.marginBottom;
          captureButton.style.marginTop = targetStyle.marginTop;

          // Fix color mismatch by explicitly checking theme
          // Light mode matches #536471, Dark mode matches #71767B
          const isDark =
            document.body.style.backgroundColor === "rgb(0, 0, 0)" ||
            document.body.style.backgroundColor === "rgb(21, 32, 43)" ||
            window.getComputedStyle(document.body).backgroundColor !==
              "rgb(255, 255, 255)";

          if (isDark) {
            captureButton.style.color = "#71767B";
          } else {
            captureButton.style.color = "#536471";
          }

          actionBar.insertBefore(captureButton, targetElement);
        } catch (e) {
          console.error("Orshot: Failed to insert button", e);
          actionBar.appendChild(captureButton);
        }
      } else {
        actionBar.appendChild(captureButton);
      }
    } else {
      // Fallback: append to the end of the action bar
      actionBar.appendChild(captureButton);
    }
  }

  createCaptureButton(isCompact = false) {
    const button = document.createElement("div");
    button.className = isCompact
      ? "orshot-capture-btn orshot-capture-btn-compact"
      : "orshot-capture-btn";

    if (isCompact) {
      button.innerHTML = `
        <div class="orshot-btn-content-compact" style="width: 18px; height: 18px; position: relative; margin-left: 20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="none">
          <g clip-path="url(#clip0_15_137)">
            <rect width="24" height="24" fill="transparent"/>
            <path d="M3 8C3 7.44772 3.44772 7 4 7H8.5L9.5 4H14.5L15.5 7H20C20.5523 7 21 7.44772 21 8V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V8Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
            </g>
            <defs>
            <clipPath id="clip0_15_137">
            <rect width="24" height="24" fill="transparent"/>
            </clipPath>
            </defs>
          </svg>
        </div>
      `;
    } else {
      button.innerHTML = `
        <div class="orshot-btn-content" style="width: 24px; height: 24px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="none">
          <g clip-path="url(#clip0_15_137)">
            <rect width="24" height="24" fill="transparent"/>
            <path d="M3 8C3 7.44772 3.44772 7 4 7H8.5L9.5 4H14.5L15.5 7H20C20.5523 7 21 7.44772 21 8V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V8Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
            </g>
            <defs>
            <clipPath id="clip0_15_137">
            <rect width="24" height="24" fill="transparent"/>
            </clipPath>
            </defs>
          </svg>
        </div>
      `;
    }

    button.title = "Create tweet screenshot with Orshot";
    return button;
  }

  async captureTweet(tweetElement) {
    const tweetUrl = this.extractTweetUrl(tweetElement);
    if (!tweetUrl) {
      this.showNotification("Could not extract tweet URL", "error");
      return;
    }

    console.log("Capturing tweet:", tweetUrl);

    // Show loading state
    const button = tweetElement.querySelector(".orshot-capture-btn");
    const originalContent = button.innerHTML;
    const isCompact = button.classList.contains("orshot-capture-btn-compact");

    if (isCompact) {
      button.innerHTML = `
        <div class="orshot-btn-content-compact loading">
          <div class="orshot-spinner" style="width: 12px; height: 12px;"></div>
        </div>
      `;
    } else {
      button.innerHTML = `
        <div class="orshot-btn-content loading">
          <div class="orshot-spinner"></div>
        </div>
      `;
    }
    button.style.pointerEvents = "none";

    try {
      const screenshot = await this.generateScreenshot(tweetUrl);
      this.displayScreenshot(screenshot);
      this.showNotification("Screenshot generated successfully!", "success");
    } catch (error) {
      console.error("Failed to capture tweet:", error);
      this.showNotification(
        `${
          error.message || "Failed to generate screenshot"
        } - Get unlimited access`,
        "error",
        "https://orshot.com/signup",
      );
    } finally {
      // Restore button
      button.innerHTML = originalContent;
      button.style.pointerEvents = "auto";
    }
  }

  extractTweetUrl(tweetElement) {
    // Method 1: Look for tweet timestamp link which contains the full tweet URL
    const timeElement = tweetElement.querySelector("time");
    if (
      timeElement &&
      timeElement.parentElement &&
      timeElement.parentElement.href
    ) {
      return timeElement.parentElement.href;
    }

    // Method 2: Look for any link that contains /status/
    const statusLinks = tweetElement.querySelectorAll('a[href*="/status/"]');
    if (statusLinks.length > 0) {
      return statusLinks[0].href;
    }

    // Method 3: Check if we're already on a tweet page
    const currentUrl = window.location.href;
    if (currentUrl.includes("/status/")) {
      return currentUrl;
    }

    // Method 4: Try to find tweet ID in data attributes or other elements
    const tweetIdMatch = tweetElement.innerHTML.match(/\/status\/(\d+)/);
    if (tweetIdMatch) {
      const username = this.extractUsername(tweetElement);
      if (username) {
        return `https://twitter.com/${username}/status/${tweetIdMatch[1]}`;
      }
    }

    return null;
  }

  extractUsername(tweetElement) {
    // Look for username in various possible locations
    const usernameSelectors = [
      '[data-testid="User-Name"] a',
      '[data-testid="User-Names"] a',
      'a[href^="/"][href*="/status/"]:not([href*="/photo/"])',
    ];

    for (const selector of usernameSelectors) {
      const element = tweetElement.querySelector(selector);
      if (element && element.href) {
        const match = element.href.match(/\/([^\/]+)\/status/);
        if (match) {
          return match[1];
        }
      }
    }

    return null;
  }

  async generateScreenshot(tweetUrl) {
    console.log("Sending message to background script for:", tweetUrl);

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "generateScreenshot",
          tweetUrl: tweetUrl,
          apiKey: this.apiKey,
        },
        (response) => {
          console.log("Received response from background:", response);

          if (chrome.runtime.lastError) {
            console.error("Chrome runtime error:", chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response) {
            reject(new Error("No response from background script"));
            return;
          }

          if (response.success) {
            resolve(response.data);
          } else {
            reject(
              new Error(response.error || "Failed to generate screenshot"),
            );
          }
        },
      );
    });
  }

  displayScreenshot(base64Image) {
    // Create modal overlay
    const modal = document.createElement("div");
    modal.className = "orshot-modal";
    modal.innerHTML = `
      <div class="orshot-modal-content">
        <div class="orshot-modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <a href="https://orshot.com" target="_blank">
              <img src="${chrome.runtime.getURL(
                "icons/icon-48.png",
              )}" style="width:42px; height:42px; border-radius: 12px;" />
            </a>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <h3>Tweet Screenshot</h3>
              <p style="color: #999; margin: 0; font-size: 14px;">Powered by <a style="color: #b6b5b5; text-decoration: underline;" href="https://orshot.com/templates/tweet-image" target="_blank">Twitter Screenshot API</a> | <a style="color: #b6b5b5; text-decoration: underline;" href="https://orshot.com/tools/twitter-carousel-generator" target="_blank">Generate Carousels from Twitter Threads</a></p> 
            </div>
          </div>
          <button class="orshot-close-btn">&times;</button>
        </div>
        <div class="orshot-modal-body">
          <img src="${base64Image}" alt="Tweet Screenshot" class="orshot-screenshot">
          <div class="orshot-modal-actions">
            <button class="orshot-download-btn">Download</button>
            <button class="orshot-copy-btn">Copy to Clipboard</button>
          </div>
        </div>
      </div>
    `;

    // Add event handlers
    const closeBtn = modal.querySelector(".orshot-close-btn");
    const downloadBtn = modal.querySelector(".orshot-download-btn");
    const copyBtn = modal.querySelector(".orshot-copy-btn");

    closeBtn.addEventListener("click", () => {
      modal.remove();
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    downloadBtn.addEventListener("click", () => {
      this.downloadImage(base64Image);
    });

    copyBtn.addEventListener("click", () => {
      this.copyImageToClipboard(base64Image);
    });

    document.body.appendChild(modal);
  }

  downloadImage(base64Image) {
    const link = document.createElement("a");
    link.href = base64Image;
    link.download = `tweet-screenshot-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async copyImageToClipboard(base64Image) {
    try {
      // Convert base64 to blob
      const response = await fetch(base64Image);
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      this.showNotification("Image copied to clipboard!", "success");
    } catch (error) {
      console.error("Failed to copy image:", error);
      this.showNotification("Failed to copy image to clipboard", "error");
    }
  }

  showNotification(message, type = "info", link = null) {
    // Remove existing notifications
    const existing = document.querySelector(".orshot-notification");
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement("div");
    notification.className = `orshot-notification orshot-notification-${type}`;

    if (link) {
      notification.style.cursor = "pointer";
      notification.innerHTML = `${message} <span style="text-decoration: underline;">→</span>`;
      notification.addEventListener("click", () => {
        window.open(link, "_blank");
        notification.remove();
      });
    } else {
      notification.textContent = message;
    }

    document.body.appendChild(notification);

    // Auto remove after 5 seconds for links, 3 seconds for others
    setTimeout(
      () => {
        if (notification.parentNode) {
          notification.remove();
        }
      },
      link ? 5000 : 3000,
    );
  }
}

// Initialize when script loads
new OrshotTweetCapture();
