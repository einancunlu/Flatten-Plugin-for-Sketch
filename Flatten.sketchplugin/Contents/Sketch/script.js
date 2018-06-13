
//------------------------------------------------------------------------------
// Created by Emin Inanc Unlu 🐼                                  🏠 emin.space
//------------------------------------------------------------------------------

/*
The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

//------------------------------------------------------------------------------
// GLOBAL
//------------------------------------------------------------------------------

const sketch = require('sketch/dom'),
  UI = require('sketch/ui'),
  Settings = require('sketch/settings'),

  // Keys
  kPluginDomain = 'com.einancunlu.sketch-plugins.flatten',
  kGroupKey = kPluginDomain + '.groupKey',
  kImageLayerKey = kPluginDomain + '.imageLayerKey',
  kArtboardOfImageLayerKey = kPluginDomain + '.artboardOfImageLayerKey',
  kLayerToBeFlattened = kPluginDomain + '.LayerToBeFlattened',
  kLayerVisibilityKey = kPluginDomain + '.layerVisibilityKey',
  kImageLayerNameKey = kPluginDomain + '.imageLayerNameKey',
  kSharedStyleNamePrefixKey = kPluginDomain + '.sharedStyleNamePrefixKey',
  kAutoFunctionsEnabledKey = kPluginDomain + '.autoFunctionsEnabledKey',
  kDefaultFlattenScaleKey = kPluginDomain + '.defaultFlattenScaleKey',

  // Constants
  flattenTag = '#flatten',
  excludeTag = '#exclude',
  scaleTagPrefix = '#s',
  disableAutoTag = '#no-auto',
  stayHiddenTag = '#stay-hidden',
  maxFlatteningScale = 10,
  minFlatteningScale = 0.05,

  // Texts
  noLayerFoundMessage = "⚠️ No layer found to be flattened. Use 'Flatten' command to create one.",
  emptySelectionMessage = '⚠️ Please select something!',

  // Utilities
  FillType = { Solid: 0, Gradient: 1, Pattern: 4, Noise: 5 },
  PatternFillType = { Tile: 0, Fill: 1, Stretch: 2, Fit: 3 }

var document, selection,

  // Settable constants
  imageLayerName = Settings.settingForKey(kImageLayerNameKey),
  imageLayerSharedStyleNamePrefix = Settings.settingForKey(kSharedStyleNamePrefixKey),
  autoFunctionsEnabled = Settings.settingForKey(kAutoFunctionsEnabledKey),
  defaultFlattenScale = Settings.settingForKey(kDefaultFlattenScaleKey)

if (!imageLayerName) imageLayerName = 'Flattened Image'
if (!imageLayerSharedStyleNamePrefix) imageLayerSharedStyleNamePrefix = 'Artboards / '
if (!autoFunctionsEnabled) autoFunctionsEnabled = 1
if (!defaultFlattenScale) defaultFlattenScale = 1

//------------------------------------------------------------------------------
// MENU COMMANDS
//------------------------------------------------------------------------------

////////
function initCommand(context) {

  document = sketch.getSelectedDocument()
  selection = document.selectedLayers
}

////////
function flatten(context) {

  initCommand(context)
  var firstSelection = selection
  var layersToBeFlattened
  var imageLayer
  if (selection.length === 0) {
    // Check if there is a last selected artboard
    const currentArtboard = context.document.currentPage().currentArtboard()
    if (!currentArtboard) {
      UI.message("⚠️ Couldn't detect the current artboard, please select an artboard.")
    }
    layersToBeFlattened = findLayersByTag_inContainer(flattenTag, currentArtboard)
    layersToBeFlattened = fromNativeArray(layersToBeFlattened)
  } else {
    // If the selection is just an artboard
    if (selection.length === 1) {
      const layer = firstSelection.layers[0]
      if (isImageLayer(layer) && isArtboard(layer.parent)) {
        if (isImageLayerOfArtboard(layer, layer.parent) && hasTag(layer, flattenTag)) {
          selection = layer.parent
        } else {
          return
        }
      }
    }
    // Find all sublayers of selection that contain flatten tag
    layersToBeFlattened = findAllSublayersWithFlattenTag(selection.layers)
  }
  // If there is no layer with flatten tag found, add flatten tag to the all of
  // the selected layers
  if (layersToBeFlattened.length === 0) {
    addTagToLayers(selection.layers, flattenTag)
    layersToBeFlattened = findAllSublayersWithFlattenTag(selection.layers)
		// layersToBeFlattened = selection.layers
  }
  // Flatten all layers
  imageLayer = flattenLayers(layersToBeFlattened)
  if (firstSelection.length === 1) {
    const layer = firstSelection.layers[0]
    if (isArtboard(layer)) {
      const artboard = layer
      if (!hasImageLayer(artboard)) {
        // Create imageLayer for the artboard and ask to create a shared style
        imageLayer = flattenLayers(firstSelection.layers)
        const placeholder = imageLayerSharedStyleNamePrefix + artboard.name
        const alert = COSAlertWindow.new()
        alert.setMessageText('Create Shared Layer Style')
        alert.setInformativeText('The artboard is flattened. Do you want to create a shared layer style for it?\n\nName of the shared layer style:')
        alert.addTextFieldWithValue(placeholder)
        alert.addButtonWithTitle('Create')
        alert.addButtonWithTitle('Not Now')
        const responseCode = alert.runModal()
        if (responseCode == 1000) {
          // Create shared style
          const textfield = alert.viewAtIndex(0)
          input = textfield.stringValue()
          layerStyle = MSSharedStyle.alloc().initWithName_firstInstance(input, imageLayer.sketchObject.style())
          context.document.documentData().layerStyles().addSharedObject(layerStyle)
        }
      }
    }
  }
	if (imageLayer) {
    // TODO: This line might be needed later when the new API allows grouping from layers
    // imageLayer.parent.sketchObject.select_byExpandingSelection(true, false)
	} else {
    // TODO: Select all layers back after flattening
  }
}

////////
function flattenAll(context) {

  initCommand(context)

  const layersToBeFlattened = findLayersByTag_inContainer(flattenTag)
  if (layersToBeFlattened.length === 0) {
    UI.message(kNoLayerFoundMessage)
  } else {
    flattenLayers(fromNativeArray(layersToBeFlattened))
    UI.message("Flattening process is completed.")
  }
}

////////
function unflattenSelection(context) {

  initCommand(context)
  if (selection.length === 0) {
    UI.message(emptySelectionMessage)
    return
  }
  for (const layer of selection.layers) {
    if (isFlattenedGroup(layer)) {
      if (!isFlattenedGroupValid(layer)) {
        UI.message("⚠️ One of the selection isn't a proper flattened group.")
      } else {
        var imageLayer, actualLayer
        for (const childLayer of layer.layers) {
          if (isImageLayer(childLayer)) {
            imageLayer = childLayer
          } else if (hasTag(childLayer, flattenTag)) {
            actualLayer = childLayer
          }
        }
        if (imageLayer) imageLayer.remove()
        if (actualLayer) actualLayer.hidden = false
        actualLayer.name = generateGroupName(actualLayer.name)
        layer.sketchObject.ungroup()
        actualLayer.sketchObject.select_byExpandingSelection(true, false)
      }
    } else if (Settings.layerSettingForKey(layer, kArtboardOfImageLayerKey)) {
      const arboardId = Settings.layerSettingForKey(layer, kArtboardOfImageLayerKey)
      const artboard = document.getLayerWithID(arboardId)
      if (artboard) layer.name = artboard.name
      else UI.message("⚠️ Couldn't find the attached artboard, so couldn't recover the name.")
    } else {
      UI.message("⚠️ Couldn't find anything to unflatten.")
    }
  }
}

////////
function toggleSelection(context) {

  initCommand(context)
  if (selection.length === 0) {
    UI.message(emptySelectionMessage)
  } else {
    setImageModeForSelectionOrAll()
  }
}

////////
function switchToImageMode(context) {

  initCommand(context)
  setImageModeForSelectionOrAll(true)
  if (selection.length === 0) {
    UI.message("Switched to image mode in all flattened groups. (Switch in specific groups by selecting groups.)")
  } else {
    UI.message("Switched to image mode in selected groups. (Switch in all groups by emptying your selection.)")
  }
}

////////
function switchToLayerMode(context) {

  initCommand(context)
  setImageModeForSelectionOrAll(false)
  if (selection.length === 0) {
    UI.message("Switched to layer mode in all flattened groups. (Switch in specific groups by selecting groups.)")
  } else {
    UI.message("Switched to layer mode in selected groups. (Switch in all groups by emptying your selection.)")
  }
}

////////
function addFlattenTagToSelection(context) {

  initCommand(context)
  if (selection.length === 0) UI.message(kEmptySelectionMessage)
  else addTagToLayers(selection.layers, flattenTag)
}

////////
function addExcludeTagToSelection(context) {

  initCommand(context)
  if (selection.length === 0) UI.message(kEmptySelectionMessage)
  else addTagToLayers(selection.layers, excludeTag)
}

////////
function addScaleTagToSelection(context) {

  initCommand(context)
  if (selection.length === 0) UI.message(kEmptySelectionMessage)
  else addTagToLayers(selection.layers, `${scaleTagPrefix}0.05`)
}

////////
function addDisableAutoTagToSelection(context) {

  initCommand(context)
  if (selection.length === 0) UI.message(kEmptySelectionMessage)
  else addTagToLayers(selection.layers, disableAutoTag)
}

////////
function addStayHiddenTagToSelection(context) {

  initCommand(context)
  if (selection.length === 0) UI.message(kEmptySelectionMessage)
  else addTagToLayers(selection.layers, stayHiddenTag)
}

////////
function settings(context) {

  initCommand(context)
  const alert = COSAlertWindow.new()
  const path = context.plugin.urlForResourceNamed("icon.png").path()
  const icon = NSImage.alloc().initByReferencingFile(path)
  alert.setIcon(icon)
	alert.setMessageText("Settings")

  alert.addAccessoryView(createCheckbox("Enable auto flattening and toggling", autoFunctionsEnabled))

  alert.addTextLabelWithValue("Flattening scale / quality (e.g. 0.5, 1, 2, 3)")
  alert.addTextFieldWithValue(defaultFlattenScale)

  alert.addTextLabelWithValue("Image layer name")
  alert.addTextFieldWithValue(imageLayerName)

  alert.addTextLabelWithValue("Artboard shared style name prefix")
  alert.addTextFieldWithValue(imageLayerSharedStyleNamePrefix)

  alert.addButtonWithTitle('Save')
  alert.addButtonWithTitle('Cancel')
  alert.addButtonWithTitle('Reset')

	const responseCode = alert.runModal()
	if (responseCode == 1000) {

    // User clicked on save button
		autoFunctionsEnabled = String(alert.viewAtIndex(0).state())
    Settings.setSettingForKey(kAutoFunctionsEnabledKey, autoFunctionsEnabled)

    var scale = parseFloat(alert.viewAtIndex(2).stringValue().replace(',', '.')).toFixed(2)
    if (isNaN(scale)) {
      UI.message("⚠️ Failed to change 'Flattening scale'. Please enter a valid scale.")
    } else {
      Settings.setSettingForKey(kDefaultFlattenScaleKey, checkScale(scale))
    }

    imageLayerName = String(alert.viewAtIndex(4).stringValue())
    Settings.setSettingForKey(kImageLayerNameKey, imageLayerName)

    imageLayerSharedStyleNamePrefix = String(alert.viewAtIndex(6).stringValue())
    Settings.setSettingForKey(kSharedStyleNamePrefixKey, imageLayerSharedStyleNamePrefix)

	} else if (responseCode == 1002) {

    // User clicked on default button
    autoFunctionsEnabled = '1'
    Settings.setSettingForKey(kAutoFunctionsEnabledKey, autoFunctionsEnabled)

    defaultFlattenScale = '1'
    Settings.setSettingForKey(kDefaultFlattenScaleKey, defaultFlattenScale)

    imageLayerName = 'Flattened Image'
    Settings.setSettingForKey(kImageLayerNameKey, imageLayerName)

    imageLayerSharedStyleNamePrefix = 'Artboards / '
    Settings.setSettingForKey(kSharedStyleNamePrefixKey, imageLayerSharedStyleNamePrefix)
	}
}

////////
function manual(context) {

  initCommand(context)
  const urlString = "https://medium.com/@einancunlu/flatten-2-0-sketch-plugin-f53984696990"
  openLinkInBrowser(urlString)
}

////////
function feedbackByMail(context) {

  initCommand(context)
  const to = encodeURI("einancunlu" + "@gma" + "il.com")
  const urlString = "mailto:" + to
  openLinkInBrowser(urlString)
}

////////
function feedbackByTwitter(context) {

  initCommand(context)
  const urlString = "https://twitter.com/einancunlu"
  openLinkInBrowser(urlString)
}

////////
function about(context) {

  initCommand(context)
  const urlString = "http://emin.space/?ref=flattenplugin"
  openLinkInBrowser(urlString)
}

////////
function donation(context) {

  initCommand(context)
  const urlString = "https://www.buymeacoffee.com/6SXFyDupj"
  openLinkInBrowser(urlString)
}

//------------------------------------------------------------------------------
// ACTIONS
//------------------------------------------------------------------------------

////////
function onSelectionChanged(context) {

  if (autoFunctionsEnabled === '0') return
  const action = context.actionContext
  const newSelection = fromNativeArray(action.newSelection)
  // const oldSelection = fromNativeArray(action.oldSelection)

  if (newSelection.length === 1) {
    const layer = newSelection[0]
    const parent = layer.parent
    if (isFlattenedGroup(parent) && isFlattenedGroupValid(parent)) {
      if (hasTag(layer, disableAutoTag)) return
      if (isImageLayer(layer)) {
        // Update it when an image layer is selected
        const actualLayer = parent.layers[(layer.index === 1 ? 0 : 1)]
        flattenLayers([actualLayer])
      } else if (hasTag(layer, flattenTag)) {
        // Set actual layer visible when it's selected
        if (hasTag(layer, stayHiddenTag)) return
        const imageLayer = parent.layers[(layer.index === 1 ? 0 : 1)]
        layer.hidden = false
        imageLayer.hidden = true
      }
    } else if (isImageLayer(layer)) {
      if (hasTag(layer, disableAutoTag)) return
      // When the image layer of the artboard is selected, update all the
      // the flattened layers inside
      if (!a && Settings.layerSettingForKey(layer, kArtboardOfImageLayerKey) === parent.id) {
        if (isArtboard(parent) && hasTag(layer, flattenTag)) {
          flattenLayers(findAllSublayersWithFlattenTag(parent.layers))
        }
      }
    }
  }
}

//------------------------------------------------------------------------------
// HELPER FUNCTIONS
//------------------------------------------------------------------------------

////////
function isFlattenedGroup(group) {

  return Settings.layerSettingForKey(group, kGroupKey)
}

////////
function isImageLayer(layer) {

  return Settings.layerSettingForKey(layer, kImageLayerKey)
}

////////
function hasImageLayer(artboard) {

  for (const layer of artboard.layers) {
    if (isImageLayer(layer)) return layer
  })
	return false
}

////////
function flattenLayers(layers) {

  const returnLayer = layers.length === 1
  for (var layer of layers) {
    if (isChildOfFlattenedGroup(layer)) continue
    const parent = layer.parent
    var layerIsArtboard = isArtboard(layer)
    var imageLayer
    if (isImageLayer(layer)) {
      imageLayer = layer
      if (isArtboard(parent)) {
        layer = parent
        layerIsArtboard = true
      } else {
        layer = parent.layers[(imageLayer.index === 1 ? 0 : 1)]
        if (!layer || !hasTag(layer, flattenTag)) continue
      }
    } else {
      // Skip the layer if it's hidden
      if (!isFlattenedGroup(parent)) {
        if (layer.hidden) continue
      }
      imageLayer = getImageLayer(layer)
    }
    // Prepare for flattening: set visibility of layers
    var backgroundLayer
    if (layerIsArtboard) {
      backgroundLayer = createArtboardBackgroudColorLayer(layer)
    }
    imageLayer.hidden = true
    var layersToHide
    if (layerIsArtboard) {
      layersToHide = findLayersByTag_inContainer(excludeTag, layer)
      each(layersToHide, function(layerToHide) {
        Settings.setLayerSettingForKey(layerToHide, kLayerVisibilityKey, layerToHide.hidden)
        layerToHide.hidden = true
      })
    } else {
      layer.hidden = false
    }
    // Duplicate the layer to be flattened if it's not an artboard
    var duplicateArtboard, duplicateLayer = null
    if (!layerIsArtboard) {
      const artboard = getArtboardOfLayer(layer)
      if (artboard) {
        Settings.setLayerSettingForKey(layer, kLayerToBeFlattened, true)
        duplicateArtboard = artboard.duplicate()
        duplicateArtboard.adjustToFit()
        createArtboardBackgroudColorLayer(duplicateArtboard)
        // Find the layer to be flattened in the duplicate
        const found = fromNativeArray(findLayersByLayerName_inContainer(layer.name, duplicateArtboard))
        for (const tempLayer of found) {
          if (Settings.layerSettingForKey(tempLayer, kLayerToBeFlattened))) {
            duplicateLayer = tempLayer
          }
        }
        Settings.setLayerSettingForKey(layer, kLayerToBeFlattened, false)
      }
    }
    if(!duplicateLayer) duplicateLayer = layer
    // Flatten
    const tempFolderPath = getTempFolderPath()
    const imagePath = exportLayerToPath(duplicateLayer, tempFolderPath)
    fillLayerWithImage(imageLayer, imagePath)
    cleanUpTempFolder(tempFolderPath)
    if (duplicateArtboard) duplicateArtboard.remove()
    if (backgroundLayer) backgroundLayer.remove()
    // Restore visibility of layers
    if (layerIsArtboard) {
      each(layersToHide, function(layerToHide) {
        const initialVisibility = Settings.layerSettingForKey(layerToHide, kLayerVisibilityKey)
        layerToHide.hidden = initialVisibility
      })
      // Sync shared style
      imageLayer.sketchObject.updateSharedStyleToMatchSelf()
      imageLayer.moveToFront()
    } else {
      layer.hidden = true && !hasTag(imageLayer, stayHiddenTag)
      // Sync shared style if it exists
      if (imageLayer.sketchObject.style().sharedObjectID()) {
        imageLayer.sketchObject.updateSharedStyleToMatchSelf()
      }
    }
    imageLayer.hidden = layerIsArtboard || hasTag(imageLayer, stayHiddenTag)
    if (returnLayer) return imageLayer
  })
}

////////
function isChildOfFlattenedGroup(layer) {

  if (isArtboard(layer)) return false
	const parent = layer.parent
	if (parent && !isPage(parent)) {
		if (hasTag(parent.name, flattenTag)) {
			return true
		} else {
			return isChildOfFlattenedGroup(parent)
		}
	}
	return false
}

////////
function getImageLayer(referenceLayer) {

  if (isArtboard(referenceLayer)) {
    const imageLayer = hasImageLayer(referenceLayer)
    if (imageLayer) {
      updateImageLayerRect(imageLayer, referenceLayer)
  		return imageLayer
    } else {
      return createImageLayer(referenceLayer, referenceLayer)
    }
  } else {
    // Check if the layer is in a proper group and has image layer in it
    const parent = referenceLayer.parent
    if (isFlattenedGroupValid(parent)) {
      for (const layer of parent.layers) {
        if (isImageLayer(layer)) {
          updateImageLayerRect(layer, referenceLayer)
          parent.adjustToFit()
          return layer
        }
      }
    } else {
      // If not, create a group and image layer
      const layersToGroup = MSLayerArray.arrayWithLayers([referenceLayer.sketchObject])
      const group = sketch.fromNative(MSLayerGroup.groupFromLayers(layersToGroup))
      group.name = generateGroupName(referenceLayer.name)
      // newGroup.setConstrainProportions(false)
      // Change later - couldn't set the index of the group
      // const group = new sketch.Group({
      //   parent: parent, name: generateGroupName(referenceLayer.name),
      //   layers: [referenceLayer]
      // })
      Settings.setLayerSettingForKey(group, kGroupKey, true)
      imageLayer = createImageLayer(referenceLayer, group)
      return imageLayer
    }
  }
}

////////
function isFlattenedGroupValid(group) {

  const isChildrenCountValid = group.layers.length === 2
  if (group && isChildrenCountValid && isFlattenedGroup(group)) {
    return true
  } else {
    return false
  }
}

////////
function updateImageLayerRect(imageLayer, referenceLayer) {

	imageLayer.frame = referenceLayer.frame
}

////////
function createImageLayer(referenceLayer) {

  const parent = referenceLayer.parent
  const imageLayer = new sketch.Shape({
    parent: isArtboard(referenceLayer) ? referenceLayer : parent,
    frame: referenceLayer.frame,
    style: { fills: [{ fillType: FillType.Pattern }] }
  })
  if (isArtboard(referenceLayer)) {
    imageLayer.frame.x = 0
    imageLayer.frame.y = 0
    imageLayer.name = imageLayerName + ' ' + flattenTag
    Settings.setLayerSettingForKey(imageLayer, kArtboardOfImageLayerKey, referenceLayer.id)
  } else {
    imageLayer.name = imageLayerName
  }
  Settings.setLayerSettingForKey(imageLayer, kImageLayerKey, true)
  return imageLayer
}

////////
function createArtboardBackgroudColorLayer(artboard) {

  var backgroundColor
  if (artboard.sketchObject.hasBackgroundColor()) {
    backgroundColor = artboard.sketchObject.backgroundColor()
  } else {
    backgroundColor = '#ffffff'
  }
  const layer = new sketch.Shape({
    parent: artboard, name: 'temp-bg', selected: false,
    frame: new sketch.Rectangle(0,0, artboard.frame.width, artboard.frame.height),
    style: {
      fills: [{ color: backgroundColor, fillType: sketch.Style.FillType.Color }]
    }
  })
  layer.moveToBack()
  return layer
}

////////
function generateGroupName(layerName) {

  return layerName.replace(' ' + flattenTag, '');
}

////////
function addTagToLayers(layers, tag) {

  for (var layer of layers) {
    if (isArtboard(layer)) continue
    if (tag === flattenTag && isImageLayer(layer)) continue
    if (!hasTag(layer, tag)) {
      layer.name = layer.name + ' ' + tag)
    }
  }
}

////////
function hasTag(layer, tag) {

  const regex = new RegExp(`${tag}(\\s|$)`, 'g')
  return regex.test(layer.name)
}

////////
function findAllSublayersWithFlattenTag(layers) {

  var array = NSArray.array()
  for (const layer of layers) {
    const layersToAdd = findLayersByTag_inContainer(flattenTag, layer)
    array = array.arrayByAddingObjectsFromArray(layersToAdd)
  }
  return fromNativeArray(array)
}

////////
function exportLayerToPath(layer, folderPath) {

  var scale = defaultFlattenScale

  // Check if there is a custom scale tag
  var nameToCheck = ''
  if (isArtboard(layer)) {
    const imageLayer = hasImageLayer(layer)
    if (imageLayer) nameToCheck = imageLayer.name
  } else {
    nameToCheck = layer.name
  }
  const regexString = `${scaleTagPrefix}(\\d{1}[\\,\\.]?\\d{0,2})`
  const regex = new RegExp(regexString, 'g')
  const match = regex.exec(nameToCheck)
  if (match && match.length === 2) {
    scale = checkScale(parseFloat(match[1].replace(',', '.')))
  }
  // Export layer
  if (isArtboard(layer)) {
    const originalLayerName = layer.name
    layer.name = "temp"
    sketch.export(layer, {
      trimmed: false,
      output: folderPath,
      scales: scale,
      formats: 'png'
    })
    layer.name = originalLayerName
  } else {
    // TODO: Use slice layer to export (trimmed: false doesn't work for now)
    const parent = layer.parent
    const parentFrame = layer.parent.frame
    const rect = NSMakeRect(0, 0, parentFrame.width, parentFrame.height)
    const slice = MSSliceLayer.alloc().initWithFrame(rect)
    parent.sketchObject.insertLayer_atIndex(slice, layer.index + 1)
    const exportFormat = MSExportFormat.formatWithScale_name_fileFormat(scale, '', 'png')
    slice.exportOptions().insertExportFormat_atIndex(exportFormat, 0)
    slice.exportOptions().setLayerOptions(2)
    const exportRequests = MSExportRequest.exportRequestsFromExportableLayer(slice)
    const path = folderPath + '/' + String(layer.id) + '.png'
    if (!document) document = sketch.getSelectedDocument()
    document.sketchObject.saveExportRequest_toFile(exportRequests[0], path)
    slice.removeFromParent()
  }

  // Return the exported file path
  const fileManager = NSFileManager.defaultManager()
  const folder = fileManager.contentsOfDirectoryAtPath_error(folderPath, nil)
  const imageFileName = folder[0]
  return folderPath + '/' + imageFileName
}

////////
function fillLayerWithImage(layer, imagePath) {

  const image = NSImage.alloc().initWithContentsOfFile(imagePath)
	const imageData = MSImageData.alloc().initWithImage(image)
  if (image && layer.type === String(sketch.Types.Shape)) {
    if (layer.sketchObject) layer = layer.sketchObject
    var fill = layer.style().firstEnabledFill()
    if (!fill) fill = layer.style().addStylePartOfType(0)
		fill.setFillType(FillType.Pattern)
    fill.setPatternFillType(PatternFillType.Fill)
    fill.setImage(imageData)
	}
}

////////
function setImageModeForSelectionOrAll(isImageModeOn) {

  var layers
  if (selection.length === 0) {
    layers = findLayersByTag_inContainer(flattenTag)
  } else {
    layers = findAllSublayersWithFlattenTag(selection.layers)
  }
  if (layers.length === 0) {
    UI.message('No layer found to be switched.')
    return
  }
  each(layers, function(layer) {
    toggleGroupMode(layer, isImageModeOn)
  })
}

////////
function toggleGroupMode(actualLayer, isImageModeOn) {

  const parent = actualLayer.parent
  if (isArtboard(actualLayer)) return
  if (isFlattenedGroup(parent)) {
    if (!isFlattenedGroupValid(parent)) return
    if (isImageModeOn === undefined) isImageModeOn = !actualLayer.hidden
    actualLayer.hidden = isImageModeOn
    const imageLayer = parent.layers[(actualLayer.index === 1 ? 0 : 1)]
    imageLayer.hidden = !isImageModeOn
  }
}

////////
function checkScale(scale) {

  if (scale > maxFlatteningScale) UI.message(`⚠️ 'Flattening scale can't be bigger than ${maxFlatteningScale}. It's been converted to ${maxFlatteningScale}.`)
  if (scale < minFlatteningScale) UI.message(`⚠️ 'Flattening scale can't be smaller than ${minFlatteningScale} It's been converted to ${minFlatteningScale}.`)
  scale = Math.min(scale, maxFlatteningScale)
  scale = Math.max(scale, minFlatteningScale)
  return scale
}

////////
function isImageLayerOfArtboard(imageLayer, artboard) {

  const arboardID = Settings.layerSettingForKey(imageLayer, kArtboardOfImageLayerKey)
  return (arboardID && arboardID === artboard.id)
}

//------------------------------------------------------------------------------
// UTILITIES
//------------------------------------------------------------------------------

////////
function each(array, handler) {

  const native = array.count ? true : false
  const count = array.count ? array.count() : array.length
  for (var i = 0; i < count; i++) {
    const layer = array[i]
    if (native) handler(sketch.fromNative(layer), i)
    else handler(layer, i)
  }
}

////////
function toArray(object) {

  if (Array.isArray(object)) {
    return object
  }
  var arr = []
  for (var j = 0; j < (object || []).length; j += 1) {
    arr.push(object[j])
  }
  return arr
}

////////
function fromNativeArray(array) {

  const jsArray = []
  each(array, function(layer) {
    jsArray.push(layer)
  })
  return jsArray
}

////////
function isArtboard(layer) {

  return layer.type === String(sketch.Types.Artboard)
}

////////
function isPage(layer) {

  return layer.type === String(sketch.Types.Page)
}

////////
function getArtboardOfLayer(layer) {

  if (isArtboard(layer)) return layer
  const parent = layer.parent
  if (parent) {
    if (isArtboard(parent)) return parent
    else return getArtboardOfLayer(parent)
  } else {
    return
  }
}

////////
function createCheckbox(label, state) {

	state = (state === '0') ? NSOffState : NSOnState
	const checkbox = NSButton.alloc().initWithFrame(NSMakeRect(0, 0, 300, 18))
	checkbox.setButtonType(NSSwitchButton)
	checkbox.setTitle(label)
	checkbox.setState(state)
	return checkbox
}

////////
function openLinkInBrowser(urlString) {

  NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString(urlString))
}

////////
function getTempFolderPath() {

	const fileManager = NSFileManager.defaultManager()
  const cachesURL = fileManager.URLsForDirectory_inDomains(NSCachesDirectory, NSUserDomainMask).lastObject()
	return cachesURL.URLByAppendingPathComponent(kPluginDomain).path() + '/' + NSDate.date().timeIntervalSince1970()
}

////////
function cleanUpTempFolder(folderPath) {

  NSFileManager.defaultManager().removeItemAtPath_error(folderPath, nil)
}

// FINDING LAYERS - Thanks to Aby Nimbalkar > https://github.com/abynim

////////
function findLayersByLayerName_inContainer(layerName, container) {

  var predicate = NSPredicate.predicateWithFormat("name == %@", layerName)
  return findLayersMatchingPredicate_inContainer_filterByType(predicate, container)
}

////////
function findLayersByTag_inContainer(tag, container) {

  var regex = '.*' + tag + '\\b.*'
  var predicate = NSPredicate.predicateWithFormat('name MATCHES[c] %@', regex)
  return findLayersMatchingPredicate_inContainer_filterByType(predicate, container)
}

////////
function findLayersMatchingPredicate_inContainer_filterByType(predicate, container, layerType) {

  if (container && container !== undefined && container.sketchObject) container = container.sketchObject
  var scope
  switch (layerType) {
    case MSPage:
      scope = document.sketchObject.pages()
      return scope.filteredArrayUsingPredicate(predicate)
      break
    case MSArtboardGroup:
      if (typeof container !== 'undefined' && container != nil) {
        if (container.className == 'MSPage') {
          scope = container.artboards()
          return scope.filteredArrayUsingPredicate(predicate)
        }
      } else {
        // search all pages
        var filteredArray = NSArray.array()
        var loopPages = document.sketchObject.pages().objectEnumerator(),
          page;
        while (page = loopPages.nextObject()) {
          scope = page.artboards()
          filteredArray = filteredArray.arrayByAddingObjectsFromArray(scope.filteredArrayUsingPredicate(predicate))
        }
        return filteredArray
      }
      break
    default:
      if (typeof container !== 'undefined' && container != nil) {
        scope = container.children()
        return scope.filteredArrayUsingPredicate(predicate)
      } else {
        // search all pages
        var filteredArray = NSArray.array()
        var loopPages = document.sketchObject.pages().objectEnumerator(),
          page;
        while (page = loopPages.nextObject()) {
          scope = page.children()
          filteredArray = filteredArray.arrayByAddingObjectsFromArray(scope.filteredArrayUsingPredicate(predicate))
        }
        return filteredArray
      }
  }
  return NSArray.array() // Return an empty array if no matches were found
}

//------------------------------------------------------------------------------
// DEPRECIATED
//------------------------------------------------------------------------------

// ////////
// function isReallyVisible(layer) {
//
// 	if (!layer.isVisible()) { return false }
// 	if (layer.class() === MSArtboardGroup) { return true }
// 	var parent = [layer parentGroup]
// 	if (parent) {
// 		return isReallyVisible(parent)
// 	} else {
// 		return true
// 	}
// }
//
// ////////
// function suggestedLayers(context) {
//
//   var doc = context.document
// 	var command = context.command
// 	selection = context.selection
//   var numberOfSuggestedLayers = 0
//   if (selection.firstObject()) {
//     selection.firstObject().select_byExpandingSelection(false, false)
//   }
//   var children = doc.currentPage().children()
//   for (var i = 0; i < [children count]; i++) {
//     var layer = children[i]
//     if (isReallyVisible(layer) == false) { continue }
//     if (layer.style != undefined) {
//       if (layer.style().blur().isEnabled()) {
//         var find = new RegExp(flattenTag, "i")
//         if (!layer.name().match(find)) {
//           numberOfSuggestedLayers++
//           layer.select_byExpandingSelection(true, true)
//         }
//       }
//     }
//   }
//
//   if (numberOfSuggestedLayers == 0) {
//     [doc showMessage: "All layers in this page seem good to me! No suggestion for this page. : )"]
//   } else {
//     var message
//     if (numberOfSuggestedLayers == 1) {
//       message =  " layer which can be flattened to increase the performance of the Sketch."
//     } else {
//       message =  " layers which can be flattened to increase the performance of the Sketch."
//     }
//     [doc showMessage: "Found " + numberOfSuggestedLayers + message]
//   }
// }
