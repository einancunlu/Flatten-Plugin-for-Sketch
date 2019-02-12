import openLinkInBrowser from './utils/openLinkInBrowser'

export function feedbackByMail() {
  // eslint-disable-next-line no-useless-concat
  const to = encodeURI('einancunlu' + '@gma' + 'il.com')
  const urlString = `mailto:${to}`
  openLinkInBrowser(urlString)
}

export function feedbackByTwitter() {
  const urlString = 'https://twitter.com/einancunlu'
  openLinkInBrowser(urlString)
}

export function manual() {
  const urlString =
    'https://medium.com/@einancunlu/flatten-2-0-sketch-plugin-f53984696990'
  openLinkInBrowser(urlString)
}

export function about() {
  const urlString = 'http://emin.space/?ref=flattenplugin'
  openLinkInBrowser(urlString)
}

export function donation() {
  const urlString = 'https://www.buymeacoffee.com/6SXFyDupj'
  openLinkInBrowser(urlString)
}
