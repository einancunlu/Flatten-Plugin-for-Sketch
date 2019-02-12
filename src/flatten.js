import * as sketch from 'sketch'
import { toArray } from 'util'
import {
  flattenTag,
  kLayerVisibilityKey,
  excludeTag,
  kLayerToBeFlattened,
  stayHiddenTag,
  kSharedStyleNamePrefixKey,
  scaleTagPrefix,
  kReferenceLayerOfPreviewLayerKey,
  kArtboardOfImageLayerKey,
  kAutoFunctionsEnabledKey,
  disableAutoTag,
} from './utils/constants'
import withTempFolder from './utils/tempFolder'
import {
  findLayersByLayerName,
  findLayersByTag,
  findAllSublayersWithFlattenTag,
} from './utils/finder'
import {
  hasTag,
  isImageLayer,
  isFlattenedGroup,
  getImageLayer,
  addTagToLayers,
  isImageLayerOfArtboard,
  createImageLayer,
  isFlattenedGroupValid,
  generateGroupName,
} from './utils'
import exportLayerToPath from './utils/export'

function createArtboardBackgroudColorLayer(artboard) {
  const backgroundColor = artboard.background.enabled
    ? artboard.background.color
    : '#ffffff'

  // BUG: Right click.
  const layer = new sketch.Shape({
    parent: artboard,
    name: 'temp-bg',
    frame: new sketch.Rectangle(
      0,
      0,
      artboard.frame.width,
      artboard.frame.height
    ),
    style: {
      fills: [{ color: backgroundColor }],
    },
  })
  layer.moveToBack()
  return layer
}

function isChildOfFlattenedGroup(layer) {
  if (layer.type === 'Artboard') return false
  const { parent } = layer
  if (parent && parent.type !== 'Page') {
    return hasTag(parent.name, flattenTag) || isChildOfFlattenedGroup(parent)
  }
  return false
}

function fillLayerWithImage(layer, imagePath) {
  // TODO: should be handled by the JS API soon
  /* globals NSImage, MSImageData */
  const image = NSImage.alloc().initWithContentsOfFile(imagePath)
  const imageData = MSImageData.alloc().initWithImage(image)
  if (layer.type !== 'Shape') {
    return
  }
  let fill = layer.style.fills.find(f => f.enabled)
  if (!fill) {
    layer.style.fills = layer.style.fills.concat({})
    fill = layer.style.fills.find(f => f.enabled)
  }
  fill.fill = sketch.Style.FillType.Pattern
  fill = fill.sketchObject
  fill.setPatternFillType(1 /* PatternFillType.Fill */)
  fill.setImage(imageData)
}

function flattenLayers(layers) {
  let imageLayer
  layers.forEach(layer => {
    if (isChildOfFlattenedGroup(layer)) {
      return
    }

    if (isImageLayer(layer)) {
      imageLayer = layer
      if (layer.parent.type === 'Artboard') {
        layer = layer.parent
      } else {
        layer = layer.parent.layers[imageLayer.index === 1 ? 0 : 1]
        if (!layer || !hasTag(layer, flattenTag)) {
          return
        }
      }
    } else {
      // Skip the layer if it's hidden
      if (!isFlattenedGroup(layer.parent) && layer.hidden) {
        return
      }
      imageLayer = createImageLayer(layer)
    }

    const layerIsArtboard = layer.type === 'Artboard'

    // Prepare for flattening: set visibility of layers
    let backgroundLayer
    if (layerIsArtboard) {
      backgroundLayer = createArtboardBackgroudColorLayer(layer) // BUG: Right click.
    }
    imageLayer.hidden = true
    const layersToHide = layerIsArtboard
      ? findLayersByTag(excludeTag, layer)
      : []
    layersToHide.forEach(layerToHide => {
      sketch.Settings.setLayerSettingForKey(
        layerToHide,
        kLayerVisibilityKey,
        layerToHide.hidden
      )
      layerToHide.hidden = true
    })

    if (!layerIsArtboard) {
      layer.hidden = false
    }

    // Duplicate the layer to be flattened if it's not an artboard
    let duplicateArtboard
    let duplicateLayer = layer
    if (!layerIsArtboard) {
      const artboard = layer.parentArtboard
      if (artboard) {
        sketch.Settings.setLayerSettingForKey(layer, kLayerToBeFlattened, true)
        duplicateArtboard = artboard.duplicate() // BUG: Right click.
        duplicateArtboard.adjustToFit()
        createArtboardBackgroudColorLayer(duplicateArtboard)
        // Find the layer to be flattened in the duplicate
        const found = findLayersByLayerName(layer.name, duplicateArtboard)
        duplicateLayer = found.find(tempLayer =>
          sketch.Settings.layerSettingForKey(tempLayer, kLayerToBeFlattened)
        )
        sketch.Settings.setLayerSettingForKey(layer, kLayerToBeFlattened, false)
      }
    }

    // Flatten
    withTempFolder(tempFolderPath => {
      const imagePath = exportLayerToPath(duplicateLayer, tempFolderPath)
      fillLayerWithImage(imageLayer, imagePath)
    })

    if (duplicateArtboard) duplicateArtboard.remove()
    if (backgroundLayer) backgroundLayer.remove()

    // Restore visibility of layers
    layersToHide.forEach(layerToHide => {
      const initialVisibility = sketch.Settings.layerSettingForKey(
        layerToHide,
        kLayerVisibilityKey
      )
      layerToHide.hidden = initialVisibility
    })

    if (layerIsArtboard) {
      imageLayer.moveToFront() // BUG: Right click.
    } else {
      layer.hidden = !hasTag(imageLayer, stayHiddenTag)
    }

    // Sync shared style if it exists
    if (imageLayer.sharedStyle) {
      imageLayer.sharedStyle.style = imageLayer.style
    }

    imageLayer.hidden = layerIsArtboard || hasTag(imageLayer, stayHiddenTag)
  })

  return imageLayer
}

export default function flatten() {
  const document = sketch.getSelectedDocument()
  const selection = document.selectedLayers

  if (selection.length === 0) {
    // Check if there is a last selected artboard, and select it again
    const currentArtboard = sketch.fromNative(
      document.selectedPage.sketchObject.currentArtboard()
    )
    if (!currentArtboard) {
      sketch.UI.message(
        "⚠️ Couldn't detect the current artboard, please select an artboard."
      )
      return
    }
    currentArtboard.selected = true
  } else if (selection.length === 1) {
    // let's check if the selected layer is a flatten image,
    // in which case, let's select the layer
    const layer = selection.layers[0]
    if (isImageLayer(layer) && layer.parent.type === 'Artboard') {
      if (
        isImageLayerOfArtboard(layer, layer.parent) &&
        hasTag(layer, flattenTag)
      ) {
        layer.selected = false
        layer.parent.selected = true
      }
    }
  }

  // Find all sublayers of selection that contain flatten tag
  let layersToBeFlattened = findAllSublayersWithFlattenTag(selection.layers)

  // If there is no layer with flatten tag found, add flatten tag to the all of
  // the selected layers
  if (layersToBeFlattened.length === 0) {
    addTagToLayers(selection.layers, flattenTag)
    layersToBeFlattened = findAllSublayersWithFlattenTag(selection.layers)
  }

  // Flatten all layers
  const imageLayer = flattenLayers(layersToBeFlattened)

  if (selection.length === 1) {
    const layer = selection.layers[0]
    if (layer.type === 'Artboard' && !getImageLayer(layer)) {
      // Create imageLayer for the artboard and ask to create a shared style
      const placeholder =
        (sketch.Settings.settingForKey(kSharedStyleNamePrefixKey) ||
          'Artboards / ') + layer.name
      sketch.UI.getInputFromUser(
        'Create Shared Layer Style',
        {
          initialValue: placeholder,
          okButton: 'Create',
          cancelButton: 'Not Now',
        },
        (err, name) => {
          if (!err) {
            sketch.SharedStyle.fromStyle({
              document,
              style: imageLayer.style,
              name,
            })
          }
        }
      )
    }
  }

  if (imageLayer) {
    // TODO: This line might be needed later when the new API allows grouping from layers
    // imageLayer.parent.sketchObject.select_byExpandingSelection(true, false)
  } else {
    // TODO: Select all layers back after flattening
  }
}

export function flattenAll() {
  const layersToBeFlattened = findLayersByTag(flattenTag)
  if (layersToBeFlattened.length === 0) {
    sketch.UI.message(
      "⚠️ No layer found to be flattened. Use 'Flatten' command to create one."
    )
  } else {
    flattenLayers(layersToBeFlattened)
    sketch.UI.message('Flattening process is completed.')
  }
}

export function createPreview() {
  const document = sketch.getSelectedDocument()
  const selection = document.selectedLayers

  if (selection.length === 0) {
    sketch.UI.message('⚠️ Please select something!')
    return
  }

  selection.layers.forEach(layer => {
    // Create image layer
    let imageLayer
    if (layer.type === 'Artboard') {
      imageLayer = getImageLayer(layer)
    } else {
      addTagToLayers([layer], flattenTag)
      imageLayer = getImageLayer(layer)
    }
    const { parent } = imageLayer

    // Flatten the layer with stay-hidden and scale tags
    addTagToLayers([imageLayer], stayHiddenTag)
    addTagToLayers([imageLayer], `${scaleTagPrefix}4`)
    flattenLayers([layer])

    // Create shared layer style
    sketch.SharedStyle.fromStyle({
      document,
      style: imageLayer.style,
      name: 'Temporary/Preview',
    })

    // Create preview layer
    const duplicateImageLayer = imageLayer.duplicate()
    sketch.Settings.setLayerSettingForKey(
      duplicateImageLayer,
      kReferenceLayerOfPreviewLayerKey,
      parent.id
    )
    duplicateImageLayer.sketchObject.moveToLayer_beforeLayer(
      parent.parent.sketchObject,
      parent.sketchObject
    )
    duplicateImageLayer.moveForward()
    duplicateImageLayer.name = 'Preview'
    duplicateImageLayer.hidden = false
    duplicateImageLayer.frame = parent.frame
    duplicateImageLayer.frame.x = parent.frame.x + parent.frame.width + 1
    duplicateImageLayer.frame.y = parent.frame.y
    const zoomValue = document.sketchObject.zoomValue()
    duplicateImageLayer.frame.scale(1 / zoomValue)

    selection.clear()

    parent.selected = true
  })
}

function recoverLayer(document, layer) {
  if (isFlattenedGroup(layer)) {
    // Unflatten the flattened group
    if (!isFlattenedGroupValid(layer)) {
      sketch.UI.message(
        `⚠️ It's isn't a proper flattened group. (Layer: ${layer.name})`
      )
      return
    }

    const imageLayer = layer.layers.find(x => isImageLayer(x))
    const actualLayer = layer.layers.find(x => hasTag(x, flattenTag))

    if (imageLayer) imageLayer.remove()
    if (actualLayer) actualLayer.hidden = false
    actualLayer.name = generateGroupName(actualLayer.name)
    layer.parent.layers = layer.parent.layers.concat(layer.layers)
    layer.remove()
    actualLayer.selected = true
    return
  }
  if (layer.type === 'Artboard') {
    // Delete the image layer and shared style if exists
    const imageLayer = getImageLayer(layer)
    if (!imageLayer) {
      sketch.UI.message(
        `⚠️ It's isn't a flattened artboard. (Layer: ${layer.name})`
      )
      return
    }

    // TODO: should be possible via the JS API in 54
    const layerStyles = imageLayer.sketchObject.documentData().layerStyles()
    const sharedStyle = layerStyles.sharedStyleWithID(
      imageLayer.sketchObject.style().sharedObjectID()
    )
    layerStyles.removeSharedStyle(sharedStyle)
    document.sketchObject.reloadInspector()
    imageLayer.remove()
    return
  }
  const referenceLayerID = sketch.Settings.layerSettingForKey(
    layer,
    kReferenceLayerOfPreviewLayerKey
  )
  if (referenceLayerID) {
    // Delete the preview layer and unflatten the attached flattened group
    const referenceLayer = document.getLayerWithID(referenceLayerID)
    if (referenceLayer.type !== 'Artboard') {
      // TODO: should be possible via the JS API in 54
      const layerStyles = document.sketchObject.documentData().layerStyles()
      const sharedStyle = layerStyles.sharedStyleWithID(
        layer.sketchObject.style().sharedObjectID()
      )
      layerStyles.removeSharedStyle(sharedStyle)
      document.sketchObject.reloadInspector()
    }
    layer.remove()
    recoverLayer(document, referenceLayer)
    return
  }

  const artboardId = sketch.Settings.layerSettingForKey(
    layer,
    kArtboardOfImageLayerKey
  )
  if (artboardId) {
    // Rename the image layer of an artboard
    const artboard = document.getLayerWithID(artboardId)
    if (!artboard) {
      sketch.UI.message(
        "⚠️ Couldn't recover the name. (Couldn't find any attached artboard.)"
      )
      return
    }
    layer.name = artboard.name
    return
  }

  sketch.UI.message(
    `⚠️ Couldn't find anything to recover. (Layer: ${layer.name})`
  )
}

export function restoreSelection() {
  const document = sketch.getSelectedDocument()
  const selection = document.selectedLayers

  if (selection.length === 0) {
    sketch.UI.message('⚠️ Please select something!')
    return
  }

  selection.layers.forEach(l => recoverLayer(document, l))
}

export function onSelectionChanged(context) {
  if (sketch.Settings.settingForKey(kAutoFunctionsEnabledKey) === '0') return
  /* globals NSEvent */
  if (NSEvent.pressedMouseButtons() === 2) return // BUG: Doesn't solve completely.

  const action = context.actionContext
  const newSelection = toArray(action.newSelection || []).map(x =>
    sketch.fromNative(x)
  )

  if (newSelection.length !== 1) {
    return
  }

  const layer = newSelection[0]

  if (hasTag(layer, disableAutoTag)) {
    return
  }

  const { parent } = layer
  if (isFlattenedGroup(parent) && isFlattenedGroupValid(parent)) {
    if (isImageLayer(layer)) {
      // Update it when an image layer is selected
      const actualLayer = parent.layers[layer.index === 1 ? 0 : 1]
      flattenLayers([actualLayer])
    } else if (hasTag(layer, flattenTag)) {
      // Set actual layer visible when it's selected
      if (hasTag(layer, stayHiddenTag)) {
        return
      }
      const imageLayer = parent.layers[layer.index === 1 ? 0 : 1]
      layer.hidden = false
      imageLayer.hidden = true
    }
    return
  }
  if (!isImageLayer(layer)) {
    return
  }
  // When the image layer of the artboard is selected, update all the
  // the flattened layers inside
  if (
    sketch.Settings.layerSettingForKey(layer, kArtboardOfImageLayerKey) ===
      parent.id &&
    parent.type === 'Artboard' &&
    hasTag(layer, flattenTag)
  ) {
    flattenLayers(findAllSublayersWithFlattenTag(parent.layers))
  }
}
