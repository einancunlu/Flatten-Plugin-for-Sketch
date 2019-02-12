import * as sketch from 'sketch'
import { addTagToLayers } from './utils'
import {
  flattenTag,
  excludeTag,
  scaleTagPrefix,
  disableAutoTag,
  stayHiddenTag,
} from './utils/constants'

export function addFlattenTagToSelection() {
  const document = sketch.getSelectedDocument()
  const selection = document.selectedLayers

  if (selection.length === 0) {
    sketch.UI.message('⚠️ Please select something!')
    return
  }
  addTagToLayers(selection.layers, flattenTag)
}

export function addExcludeTagToSelection() {
  const document = sketch.getSelectedDocument()
  const selection = document.selectedLayers

  if (selection.length === 0) {
    sketch.UI.message('⚠️ Please select something!')
    return
  }
  addTagToLayers(selection.layers, excludeTag)
}

export function addScaleTagToSelection() {
  const document = sketch.getSelectedDocument()
  const selection = document.selectedLayers

  if (selection.length === 0) {
    sketch.UI.message('⚠️ Please select something!')
    return
  }
  addTagToLayers(selection.layers, `${scaleTagPrefix}0.05`)
}

export function addDisableAutoTagToSelection() {
  const document = sketch.getSelectedDocument()
  const selection = document.selectedLayers

  if (selection.length === 0) {
    sketch.UI.message('⚠️ Please select something!')
    return
  }
  addTagToLayers(selection.layers, disableAutoTag)
}

export function addStayHiddenTagToSelection() {
  const document = sketch.getSelectedDocument()
  const selection = document.selectedLayers

  if (selection.length === 0) {
    sketch.UI.message('⚠️ Please select something!')
    return
  }
  addTagToLayers(selection.layers, stayHiddenTag)
}
