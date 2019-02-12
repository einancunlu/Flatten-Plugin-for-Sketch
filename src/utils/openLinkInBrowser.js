/* globals NSWorkspace, NSURL */

export default function openLinkInBrowser(urlString) {
  NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString(urlString))
}
