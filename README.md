# ngx-cam-shoot [![npm version](https://badge.fury.io/js/ngx-cam-shoot.svg)](https://badge.fury.io/js/ngx-cam-shoot) [![Build Status](https://api.travis-ci.com/rzodev/ngx-webcam.svg?branch=master)](https://app.travis-ci.com/github/rzodev/ngx-cam-shoot) [![Support](https://img.shields.io/badge/Support-Angular%2018%2B-blue.svg?style=flat-square)]() [![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/RzoDev/ngx-cam-shoot/blob/main/LICENSE.md)

An angular component to use you device's cameras easily. Obtain and save images faster.
Thought to use on mobile devices.



## Features

- UI friendly and easily to use
- FaceMode interactive (change from front to back)
- Can use Flashlight feature (If the current camera device support)
- Can use Zoom feature
- Preview of image captured
- Interface color configurable
- Can select the camera device you want to use

## Prerequisites

- Angular: `>=18.2.0`

**Important:** To use in localhost, you must be serve on https context for modern browsers to permit WebRTC/UserMedia access.

## Usage

1. Install via npm

`npm i ngx-cam-shoot`

2. Import

You can import the Component in your module

```typescript
import { NgxCamShoot } from 'ngx-cam-shoot';

@NgModule({
  imports: [
    NgxCamShoot,
    ...
  ],
  ...
})
```

Or directly on the component where you want to use using **standalone** feature

```typescript
import { NgxCamShoot } from 'ngx-cam-shoot';

@Component({
  standalone: true,
  imports: [
    NgxCamShoot,
    ...
  ]
  ...
})
,
```

3. Add the ngx-cam-shoot tag element on your Html component and bind it, you can trigger the cam shoot using the initCapture() method

```html
<ngx-cam-shoot #cam (sendImage)="receiveCapture($event)"/>
<button (click)="cam.initCapture()">Take capture</button>
```

4. To start capture from ts, you first need reference the element and after you can trigger the cam shoot using the initCapture() on your own method

```typescript
@ViewChild('cam') camShoot!: NgxCamShoot;

openCam(){
    this.camShoot.initCapture();
}
```

5. You can gets the image as Data URI string putting your receiver method on (sendImage) output event

```html
<ngx-cam-shoot #cam (sendImage)="receiveCapture($event)"/>
```

## Configuration

**Inputs** You can config the next features

- `[config] (ICamShootConfig)`: obect to set default config (*).
- (*)`[canChangeMode]`: show change mode button (default = true);
- (*)`[type]`: set the custom camera mode (default = eCamShootType.DEFAULT);
- (*)`[color]`: Any css color format RGB color for skin (default = '#282828');
- (*)`[displayTitle]`:  = show title bar (default = true);
- (*)`[title]`: title description (default = 'Capture image');
- (*)`[showFaceMode]`: show face mode icon on title bar (default = false);
- `[usePreview]`: active capture preview mode (default = true);
- `[showErrors]`: show error on camera (default = false);
- `[debugMode]`: active debug mode (default = false);
- (*)`[btnTakeAnother]`: text on button to take another capture (default = 'Take another');
- (*)`[btnAcceptCapture]`: text on button to accept capture (default = 'Accept capture');

**(*)** These inputs are included in `[config] (ICamShootConfig)` input.

**Output** You need config the output image
- `(sendImage) (EventEmitter<string>)`: Get the image as Data URI string;
