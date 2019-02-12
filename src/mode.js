import * as sketch from 'sketch'
import { findAllSublayersWithFlattenTag, findLayersByTag } from './utils/finder'
import { flattenTag } from './utils/constants'
import { isFlattenedGroup, isFlattenedGroupValid } from './utils'

function toggleGroupMode(actualLayer, isImageModeOn) {
  if (actualLayer.type === 'Artboard') {
    return
  }
  const { parent } = actualLayer
  if (!isFlattenedGroup(parent)) {
    return
  }
  if (!isFlattenedGroupValid(parent)) {
    return
  }
  if (isImageModeOn === undefined) {
    isImageModeOn = !actualLayer.hidden
  }

  actualLayer.hidden = isImageModeOn
  const imageLayer = parent.layers[actualLayer.index === 1 ? 0 : 1]
  imageLayer.hidden = !isImageModeOn
}

function setImageModeForSelectionOrAll(selection, isImageModeOn) {
  const layers =
    selection.length === 0
      ? findLayersByTag(flattenTag)
      : findAllSublayersWithFlattenTag(selection.layers)

  if (layers.length === 0) {
    sketch.UI.message('No layer found to be switched.')
    return
  }
  layers.forEach(layer => toggleGroupMode(layer, isImageModeOn))
}

export function toggleSelection() {
  const document = sketch.getSelectedDocument()
  const selection = document.selectedLayers

  if (selection.length === 0) {
    sketch.UI.message('⚠️ Please select something!')
    return
  }
  setImageModeForSelectionOrAll(selection)
}

export function switchToImageMode() {
  const document = sketch.getSelectedDocument()
  const selection = document.selectedLayers

  setImageModeForSelectionOrAll(selection, true)
  if (selection.length === 0) {
    sketch.UI.message(
      'Switched to image mode in all flattened groups. (Switch in specific groups by selecting groups.)'
    )
  } else {
    sketch.UI.message(
      'Switched to image mode in selected groups. (Switch in all groups by emptying your selection.)'
    )
  }
}

export function switchToLayerMode() {
  const document = sketch.getSelectedDocument()
  const selection = document.selectedLayers

  setImageModeForSelectionOrAll(selection, false)
  if (selection.length === 0) {
    sketch.UI.message(
      'Switched to layer mode in all flattened groups. (Switch in specific groups by selecting groups.)'
    )
  } else {
    sketch.UI.message(
      'Switched to layer mode in selected groups. (Switch in all groups by emptying your selection.)'
    )
  }
}
