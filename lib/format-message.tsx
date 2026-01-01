import React from "react"

/**
 * Converts URLs in text to clickable links
 * @param text - The text that may contain URLs
 * @returns React elements with clickable links
 */
export function formatMessageWithLinks(text: string): React.ReactNode {
  if (!text) return text

  // URL regex pattern - matches http, https, www, and common domains
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/gi

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    // Process the URL
    let url = match[0]
    let displayUrl = url

    // Add protocol if missing
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url
    }

    // Truncate display URL if too long
    if (displayUrl.length > 50) {
      displayUrl = displayUrl.substring(0, 47) + "..."
    }

    // Add the link
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:opacity-80 break-all text-inherit"
        style={{ wordBreak: "break-all" }}
      >
        {displayUrl}
      </a>
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  // If no URLs found, return original text
  if (parts.length === 0) {
    return text
  }

  return <>{parts}</>
}

