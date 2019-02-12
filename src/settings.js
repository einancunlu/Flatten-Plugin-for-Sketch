/* globals NSOffState, NSOnState, NSButton, NSSwitchButton, NSMakeRect, COSAlertWindow, NSImage */
/* eslint-disable eqeqeq */
import * as sketch from 'sketch'
import {
  kAutoFunctionsEnabledKey,
  kDefaultFlattenScaleKey,
  kImageLayerNameKey,
  kSharedStyleNamePrefixKey,
} from './utils/constants'
import { checkScale } from './utils/scale'

function createCheckbox(label, state) {
  state = state === '0' ? NSOffState : NSOnState
  const checkbox = NSButton.alloc().initWithFrame(NSMakeRect(0, 0, 300, 18))
  checkbox.setButtonType(NSSwitchButton)
  checkbox.setTitle(label)
  checkbox.setState(state)
  return checkbox
}

export default function settings(context) {
  const alert = COSAlertWindow.new()
  const path = context.plugin.urlForResourceNamed('logo.png').path()
  const icon = NSImage.alloc().initByReferencingFile(path)
  alert.setIcon(icon)
  alert.setMessageText('Settings')

  alert.addAccessoryView(
    createCheckbox(
      'Enable auto flattening and toggling',
      sketch.Settings.settingForKey(kAutoFunctionsEnabledKey) || '1'
    )
  )

  alert.addTextLabelWithValue('Flattening scale / quality (e.g. 0.5, 1, 2, 3)')
  alert.addTextFieldWithValue(
    sketch.Settings.settingForKey(kDefaultFlattenScaleKey) || '1'
  )

  alert.addTextLabelWithValue('Image layer name')
  alert.addTextFieldWithValue(
    sketch.Settings.settingForKey(kImageLayerNameKey) || 'Flattened Image'
  )

  alert.addTextLabelWithValue('Artboard shared style name prefix')
  alert.addTextFieldWithValue(
    sketch.Settings.settingForKey(kSharedStyleNamePrefixKey) || 'Artboards / '
  )

  alert.addButtonWithTitle('Save')
  alert.addButtonWithTitle('Cancel')
  alert.addButtonWithTitle('Reset')

  const responseCode = alert.runModal()
  if (responseCode == 1000) {
    // User clicked on save button
    sketch.Settings.setSettingForKey(
      kAutoFunctionsEnabledKey,
      String(alert.viewAtIndex(0).state())
    )

    const scale = parseFloat(
      alert
        .viewAtIndex(2)
        .stringValue()
        .replace(',', '.')
    ).toFixed(2)
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(scale)) {
      sketch.UI.message(
        "⚠️ Failed to change 'Flattening scale'. Please enter a valid scale."
      )
    } else {
      sketch.Settings.setSettingForKey(
        kDefaultFlattenScaleKey,
        checkScale(scale)
      )
    }

    sketch.Settings.setSettingForKey(
      kImageLayerNameKey,
      String(alert.viewAtIndex(4).stringValue())
    )
    sketch.Settings.setSettingForKey(
      kSharedStyleNamePrefixKey,
      String(alert.viewAtIndex(6).stringValue())
    )
  } else if (responseCode == 1002) {
    // User clicked on reset button

    sketch.Settings.setSettingForKey(kAutoFunctionsEnabledKey, '1')
    sketch.Settings.setSettingForKey(kDefaultFlattenScaleKey, '1')
    sketch.Settings.setSettingForKey(kImageLayerNameKey, 'Flattened Image')
    sketch.Settings.setSettingForKey(kSharedStyleNamePrefixKey, 'Artboards / ')
  }
}
