# Orshot Chrome Extension

A Chrome extension that adds "Capture" buttons to tweets on Twitter/X, allowing you to generate beautiful tweet screenshots with one click using the Orshot API.

## Features

- 🔥 One-click tweet screenshot generation
- 📱 Works on both twitter.com and x.com
- 🎨 Beautiful modal preview with download and copy options
- ⚡ Fast and lightweight
- 🔐 Optional API key for unlimited usage
- 🌙 Dark mode support
- 📱 Mobile responsive design

## Installation

1. Clone or download this repository
2. Add icon files to the `icons/` folder:

   - `icon-16.png` (16x16 pixels)
   - `icon-32.png` (32x32 pixels)
   - `icon-48.png` (48x48 pixels)
   - `icon-128.png` (128x128 pixels)

3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select this folder
6. The extension should now be installed!

## Usage

1. Visit any tweet on Twitter or X
2. Look for the blue "Capture" button next to the like/retweet buttons
3. Click the button to generate a screenshot
4. The screenshot will appear in a modal where you can:
   - Download it as a PNG file
   - Copy it to your clipboard
   - Close the modal

## Configuration

Click the extension icon in your browser toolbar to access settings:

- **API Key**: Optional. Without an API key, you'll have rate limits. Get a free API key from [orshot.com](https://orshot.com)

## How it Works

The extension:

1. Automatically detects tweets on Twitter/X pages
2. Adds "Capture" buttons to each tweet's action bar
3. Extracts the tweet URL when you click "Capture"
4. Sends a request to the Orshot API to generate a screenshot
5. Displays the result in a beautiful modal interface

## API Integration

This extension uses the Orshot API endpoint:

```
POST https://orshot.com/api/templates/make-playground-request
```

With the following payload:

```json
{
  "templateSlug": "tweet-image",
  "modifications": {
    "tweetUrl": "https://twitter.com/username/status/123456789"
  },
  "userAPIKey": "your-api-key-here",
  "responseType": "base64",
  "responseFormat": "png",
  "renderType": "images",
  "source": "chrome-extension"
}
```

## Files Structure

```
orshot-chrome/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker for API requests
├── content.js            # Main content script for Twitter/X
├── popup.html            # Settings popup interface
├── popup.js              # Settings popup logic
├── styles.css            # Extension styles
├── icons/                # Extension icons (16, 32, 48, 128px)
└── README.md             # This file
```

## Permissions

The extension requires these permissions:

- `activeTab`: To interact with Twitter/X pages
- `storage`: To save your API key settings
- `https://twitter.com/*` and `https://x.com/*`: To add capture buttons
- `https://orshot.com/*`: To make API requests

## Development

To modify the extension:

1. Make your changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh button on the extension card
4. Reload any Twitter/X tabs to see your changes

## Troubleshooting

**Capture buttons not appearing:**

- Make sure you're on twitter.com or x.com
- Try refreshing the page
- Check that the extension is enabled

**Screenshots failing to generate:**

- Check your internet connection
- Verify the tweet URL is valid and public
- Try adding an API key in the extension settings

**Rate limit errors:**

- Get a free API key from orshot.com
- Add it in the extension popup settings

## License

MIT License - feel free to modify and distribute!
