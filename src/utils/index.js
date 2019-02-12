import * as sketch from 'sketch'
import {
  kGroupKey,
  kImageLayerKey,
  kArtboardOfImageLayerKey,
  flattenTag,
  kImageLayerNameKey,
} from './constants'

export function hasTag(layer, tag) {
  const regex = new RegExp(`${tag}(\\s|$)`, 'g')
  return regex.test(layer.name)
}

export function isFlattenedGroup(group) {
  return sketch.Settings.layerSettingForKey(group, kGroupKey)
}

export function isImageLayer(layer) {
  return sketch.Settings.layerSettingForKey(layer, kImageLayerKey)
}

export function addTagToLayers(layers, tag) {
  layers.forEach(layer => {
    if (
      layer.type === 'Artboard' ||
      (tag === flattenTag && isImageLayer(layer)) ||
      hasTag(layer, tag)
    ) {
      return
    }
    layer.name = `${layer.name} ${tag}`
  })
}

export function isImageLayerOfArtboard(imageLayer, artboard) {
  const arboardID = sketch.Settings.layerSettingForKey(
    imageLayer,
    kArtboardOfImageLayerKey
  )
  return arboardID && arboardID === artboard.id
}

export function getImageLayer(artboard) {
  return artboard.layers.find(
    layer => isImageLayer(layer) && hasTag(layer, flattenTag)
  )
}

export function isFlattenedGroupValid(group) {
  return group && group.layers.length === 2 && isFlattenedGroup(group)
}

const regex = new RegExp(' #flatten.*', 'g')
export function generateGroupName(layerName) {
  return layerName.replace(regex, '')
}

function actuallyCreateImageLayer(referenceLayer, parent) {
  const imageLayerName =
    sketch.Settings.settingForKey(kImageLayerNameKey) || 'Flattened Image'

  const imageLayer = new sketch.Shape({
    parent,
    frame: referenceLayer.frame,
    style: { fills: [{}] },
    name:
      referenceLayer.type === 'Artboard'
        ? `${imageLayerName} ${flattenTag}`
        : imageLayerName,
  })

  if (referenceLayer.type === 'Artboard') {
    imageLayer.frame.x = 0
    imageLayer.frame.y = 0
    sketch.Settings.setLayerSettingForKey(
      imageLayer,
      kArtboardOfImageLayerKey,
      referenceLayer.id
    )
  }

  sketch.Settings.setLayerSettingForKey(imageLayer, kImageLayerKey, true)
  return imageLayer
}

export function createImageLayer(referenceLayer) {
  if (referenceLayer.type === 'Artboard') {
    const imageLayer = getImageLayer(referenceLayer)
    if (imageLayer) {
      imageLayer.frame = referenceLayer.frame
      return imageLayer
    }
    return actuallyCreateImageLayer(referenceLayer, referenceLayer)
  }

  // Check if the layer is in a proper group and has image layer in it
  const { parent } = referenceLayer.parent
  if (isFlattenedGroupValid(parent)) {
    const imageLayer = parent.layers.find(layer => isImageLayer(layer))
    if (imageLayer) {
      imageLayer.frame = referenceLayer
      parent.adjustToFit()
      return imageLayer
    }
  }

  // If not, create a group and image layer
  const group = new sketch.Group({
    parent,
    layers: [referenceLayer],
    name: generateGroupName(referenceLayer.name),
  })

  sketch.Settings.setLayerSettingForKey(group, kGroupKey, true)
  const imageLayer = actuallyCreateImageLayer(referenceLayer, group)
  return imageLayer
}
