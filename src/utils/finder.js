/* globals NSArray, NSPredicate */

import { toArray } from 'util'
import { fromNative } from 'sketch'
import { flattenTag } from './constants'

function wrap(nsarray) {
  return toArray(nsarray).map(x => fromNative(x))
}

function findLayersMatchingPredicate(predicate, container) {
  if (container && container !== undefined && container.sketchObject) {
    container = container.sketchObject
  }
  let scope
  if (container) {
    scope = container.children()
    return wrap(scope.filteredArrayUsingPredicate(predicate))
  }
  // search all pages
  let filteredArray = NSArray.array()
  const loopPages = container
    .documentData()
    .pages()
    .objectEnumerator()
  let page = loopPages.nextObject()
  while (page) {
    scope = page.children()
    filteredArray = filteredArray.arrayByAddingObjectsFromArray(
      scope.filteredArrayUsingPredicate(predicate)
    )
    page = loopPages.nextObject()
  }
  return wrap(filteredArray)
}

export function findLayersByLayerName(layerName, container) {
  const predicate = NSPredicate.predicateWithFormat('name == %@', layerName)
  return findLayersMatchingPredicate(predicate, container)
}

export function findLayersByTag(tag, container) {
  const regex = `.*${tag}\\b.*`
  const predicate = NSPredicate.predicateWithFormat('name MATCHES[c] %@', regex)
  return findLayersMatchingPredicate(predicate, container)
}

export function findAllSublayersWithFlattenTag(layers) {
  return layers.reduce(
    (prev, layer) => prev.concat(findLayersByTag(flattenTag, layer)),
    []
  )
}
