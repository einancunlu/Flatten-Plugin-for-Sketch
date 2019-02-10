# Flatten Plugin for Sketch

Version 2 is here! Check out my new [Medium post](https://medium.com/@einancunlu/flatten-2-0-sketch-plugin-f53984696990) for all the new features!

# Installation

With Sketch Runner, just go to the `install` command and search for `Flatten`. Runner allows you to manage plugins and do much more to speed up your workflow in Sketch. [Download Runner here](http://www.sketchrunner.com).

<a href="http://bit.ly/SketchRunnerWebsite">
  <img width="160" height="41" src="http://bit.ly/RunnerBadgeBlue">
</a>

# Changelog

## Game Over...
Here my answer to a message:

Hi X,

It's great to hear that some people use my plugin. I wish I had enough time and resources to fix it. Unfortunately it's really unlikely.

I don't have enough time, but more importantly, Sketch doesn't make anything easier for plugin developers. They don't update their plugin development kit and documentation as they should do. So, every time they change things, we need to try and find out the problem. This is really abrasive. I updated my plugin so many times saying to myself that it's for the last time, but it just kept happening. So I really don't have any more patient left nor willing. Sketch team seems really reckless (or impulsive) about the plugins, developers, users and documentation.

So, no more Sketch for me. I'm planning to switch to Figma soon. They stopped being revolutionary anyway, they are doing nothing good enough IMHO. Every update is mess and I really don't like how they plan things out. I suggest you to do the same. I'm just waiting for the second stage update of the plugin development kit of Figma (they did the first stage already). As soon as they have the plugin support, I will delete Sketch for forever, probably. Really sorry for that... :(

Bests,
Emin

## v2.1.0

- Now, it's easier than ever to create a preview layer from an artboard or layer with a command instead of creating it yourself. It automatically detects the zoom value of the viewport and creates the preview layer scaled to be seen in 100% zoom value. I will update the Medium post soon to show the changes, stay tuned!
- Delete this preview layer and restore all the related things easily with the restore command.
- Added Sketchrunner command icons and descriptions. Now, it's easier to recognize the command items in Sketchrunner's search panel.
- Some bug fixes and improvements.

## v2.0.1

- Layer mirroring: Now you can mirror a normal layer by creating a shared style. The plugin will update it automatically when you flatten again.
- Auto flattening: If you select "Flattened Image" layers in groups or artboards, they will be updated automatically.
- Auto toggling: Select the hidden actual layer to make it visible automatically. Select the flattened image back to toggle it back and update.
- New tags: #no-auto, #stay-hidden, #sx.xx, #exclude. (Check out the Medium post for all the details.)
- Settings panel for customizing the values like flattening scale (quality), style name prefix etc. You can also turn on and off the automated features.
- Unflattening: Select a flattened group and unflatten to revert it back. If you unflatten an artboard image layer, it will change the name to match the artboard it's connected to.
- Now, there is no need to add artboard color or to keep the layer inside the borders of the artboard to be able to flatten it correctly. Flatten everything everywhere!
- Sketch 5.0 fix.

## v1.6.3
- Sketch 4.7 fix.

## v1.6
- Sketch 4.5 fix.
- Support for the plugin update feature of Sketch.

## v1.5
- Sketch 4.3.1 fix.

## v1.4
- Bug fix.

## v1.3
- Sketch 3.9 fix.
- Now artboard shared styles sync automatically after reflattening artboards.
- New command: Toggle. You can toggle single or multiple flattened layers to edit them easily by selecting the group(s) and run the toggle command.

## v1.2
- Sketch 3.8 fix.
- Now when you flatten a single layer, the selection will be updated to the group created.

## v1.1
- Fixed compatibility issues with Sketch 3.5.
- Plugin menu improvements.

# Contact

[Twitter](https://twitter.com/einancunlu)

# License

The MIT License (MIT)
