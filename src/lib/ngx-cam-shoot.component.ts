import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
//import { Subscription } from 'rxjs';

export enum eCamShootType{
  DEFAULT = 'DEFAULT',
  SELFIE = 'SELFIE',
  DOCFRONT = 'DOCFRONT',
  DOCBACK = 'DOCBACK'
}
export enum eCamShootFaceMode{
  USER = 'user',
  ENVIRONMENT = 'environment'
}
export interface ICamShootDevice{
  label: string;
  deviceId: string;
  isFront?: boolean;
  mode: eCamShootFaceMode
  haveTorch: boolean;
}

export interface ICamShootConfig{
  displayTitle?: boolean;
  title?: string;
  showFaceMode?: boolean;
  canChangeMode?: boolean;
  type?: eCamShootType;
  color?: string;
  usePreview?: boolean;
  btnTakeAnother?: string;
  btnAcceptCapture?: string;
}

interface  IZoomConfig{
  min: number;
  max: number;
  step: number;
}

@Component({
    selector: 'ngx-cam-shoot',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule
    ],
    standalone: true,
    template: `
 <ng-container *ngIf="usePreview && displayPreview">
  <div class="cam-shoot-backdrop"></div>
  <div class="cam-shoot-preview">
    <div class="preview-dialog">
      <div class="preview-content">
        <div class="preview-image">
          <picture *ngIf="isCaptured">
            <img [src]="imageCaptured">
          </picture>
        </div>
        <div class="preview-btns">
          <button (click)="takeAnother()" [innerHTML]="btnTakeAnother"></button>
          <button (click)="sendCapture()" [innerHTML]="btnAcceptCapture"></button>
        </div>
      </div>
    </div>
  </div>
</ng-container>
<div *ngIf="modalCapture" class="cam-shoot l{{orientationDegs}}" [class.landscape2]="isMobile && isLandscape" [style]="getStyleConfig()">
  <div class="video-container">
    <div class="video-block">
      <video
        [class.show]="!isCaptured"
        [class.hide]="isCaptured"
        [class.selfie]="faceMode=='user'"
        #videoImage
        id="videocap"
        width="100%"
        autoplay
        playsinline
      ></video>
    </div>
    <canvas
        #canvasImage
        id="canvas"
    ></canvas>
  </div>
  <div class="mask">
    <div class="changing" *ngIf="isChangingDevice"><span>Loading device</span></div>
    <div *ngIf="showErrors && error.length>0" class="msgError" [innerHtml]="getErrors()" (dblclick)="error = ''"></div>
    <div *ngIf="debugMode && debug.length>0" class="msgError" [innerHtml]="getDebugInfo()" (dblclick)="debug = ''"></div>

    <div class="close-btn" (click)="close()"></div>
    <div *ngIf="displayTitle" class="head-title">{{title}} <span *ngIf="showFaceMode" [innerHTML]="faceMode=='user'?'😀':'📱'"]></span><!-- <span *ngIf="isLandscape"> (L)</span><span *ngIf="isMobile"> (M)</span> --></div>

    <div class="focus-aim" *ngIf="!isDefault()">
      <div class="selfie-aim" *ngIf="isSelfie()">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
      </div>
      <div class="doc-aim" [class.doc-front]="isDocFront()" *ngIf="isDocument()"></div>
    </div>

    <div class="config">
      <div class="btnx btn-devices" *ngIf="hasMultipleDevicesOnMode">
        <select [formControl]="device">
          <ng-container *ngFor="let c of devices">
            <option *ngIf="c.mode==faceMode" [value]="c.deviceId">{{c.label}}<span *ngIf="c.haveTorch">(🔦)</span><span *ngIf="debugMode"> - {{c.deviceId}}</span></option>
          </ng-container>
        </select>
      </div>
    </div>
    <div class="controls">
      <div class="zoom" *ngIf="canActiveZoom && !isDocument()">
        <input type="range" [formControl]="zoom" [min]="zoomConfig.min" [max]="zoomConfig.max" [step]="zoomConfig.step">
        <span [innerHTML]="getZoomPercent()"></span>
      </div>
      <button role="btn" class="btnx btn-flash" [ngClass]="{'not-available':!canUseFlash,'opaque':!canActiveFlash,'lights-on':isFlashActive}" (click)="toogleFlash()">&nbsp;</button>
      <button role="btn" class="btnx btn-shoot" (click)="takeCapture()">&nbsp;</button>
      <button role="btn" class="btnx btn-change" [ngClass]="{'opaque':devices.length==1 || isChangingDevice}" (click)="toogleMode()" *ngIf="canChangeMode">&nbsp;</button>
    </div>
  </div>
</div>
  `,
    styles: `*, ::before, ::after {
    box-sizing: border-box;
}
.cam-shoot-backdrop{
    --bs-backdrop-zindex: ;
    --bs-backdrop-bg: ;
    --bs-backdrop-opacity: ;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1050;
    width: 100vw;
    height: 100vh;
    background-color: #000;
    opacity: 0.5;
}
.cam-shoot-preview{
    display: block !important;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1055;
    width: 100%;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    outline: 0;
    display: flex;
    justify-content: center;
    align-items: center;
}
.cam-shoot-preview .preview-dialog{
    position: relative;
    width: auto;
    margin: 1.75rem;
    pointer-events: none;

    height: 100%;
    display: flex;
    align-items: center;
}
.cam-shoot-preview .preview-dialog .preview-content{
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    color: var(--bs-modal-color);
    pointer-events: auto;
    background-color: #fff;
    background-clip: padding-box;
    border: 1px solid rgba(0,0,0,.175);
    border-radius: .5rem;
    outline: 0;
    padding:.75rem;
}
@media (min-width: 576px) {
    .cam-shoot-preview .preview-dialog {
      max-width: 500px;
      margin-right: auto;
      margin-left: auto;
    }
}
.camera{
    cursor: pointer;
    background-color: #fff;
    background-image: url('data:image/svg+xml,<svg width="800px" height="800px" viewBox="0 -3 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"/><g stroke-linecap="round" stroke-linejoin="round"/><g><path fill-rule="evenodd" clip-rule="evenodd" d="M3 3H5.58579L8 0.58579C8.37507 0.21071 8.88378 0 9.41421 0H14.5858C15.1162 0 15.6249 0.21071 16 0.58579L18.4142 3H21C22.6569 3 24 4.34315 24 6V15C24 16.6569 22.6569 18 21 18H3C1.34315 18 0 16.6569 0 15V6C0 4.34315 1.34315 3 3 3zM15 10C15 11.6569 13.6569 13 12 13C10.3431 13 9 11.6569 9 10C9 8.3431 10.3431 7 12 7C13.6569 7 15 8.3431 15 10zM17 10C17 12.7614 14.7614 15 12 15C9.23858 15 7 12.7614 7 10C7 7.2386 9.23858 5 12 5C14.7614 5 17 7.2386 17 10z" fill="%23758ca3"/></g></svg>');
    background-repeat: no-repeat;
    background-position: center;
    background-size: 100px;
    height: 120px;
    width: 100%;
    display: flex;
    border: 4px dashed #000;
    border-radius: 12px;
    margin: 12px 0;
}
picture>img{
    max-width: 100%;
    height: auto;
}
.preview-btns{
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr 1fr;
    margin-top: .4rem;
}
.preview-btns button{
    border-radius: 4px;
    padding: 3px 6px;
    background-color: #282828;
    color: #fff;
    font-size: .8rem;
    border: 0;
}
.cam-shoot{
    height: 100%;
    width: 100%;
    z-index:10000001;
    position: fixed;
    top:0;
    left:0;
    right:0;
    bottom:0;
    background-color: #fff;
    overflow-x: hidden;
    overflow-y: hidden !important;
}
.cam-shoot.landscape{
    transform: rotate(-90deg);
    width: var(--cs-sh);
    height: var(--cs-sw);
    background: orange;
    transform-origin: top right;
    margin-left: calc( var(--cs-sh) * -1);
    margin-top: 1px;
}
/* .cam-shoot>.head-title{
    width: 100%;
    background-color: var(--cs-head-color);
    color:#fff;
    height: 50px;
    line-height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    position: relative;
    z-index: 2;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;
} */
.cam-shoot .video-mask,
.cam-shoot .video-container,
.cam-shoot .video-container .video-block{
    height: 100%;
    width: 100%;
    position: relative;
    display: flex;
}
.cam-shoot .video-container{
    z-index: 1;
}
.cam-shoot .video-container video,
.cam-shoot .video-mask video{
    /* height: calc(100% - 50px); */
    margin-top: -50px;
}
.cam-shoot.landscape .video-container .video-block{
    transition: transform .5s;
    transform: rotate(90deg);
    transform-origin: center;
    background-color: green;
}
.cam-shoot.landscape .video-container .video-block video,
.cam-shoot.landscape .video-mask .video-block video{
    width: 100%;
    height: 100%;
    position: absolute;
    left: calc(calc(var(--cs-sw)/2 - var(--cs-sh)/2) * -1);
    top: 0;
}
.cam-shoot:not(.landscape) .video-container video,
.cam-shoot:not(.landscape) .video-mask video{
    object-fit: cover;
}
.cam-shoot .video-container video.selfie,
.cam-shoot .video-mask video.selfie{
    -webkit-transform: scaleX(-1);
    transform: scaleX(-1);
}
.cam-shoot .video-container video.mirror,
.cam-shoot .video-mask video.mirror {
    -webkit-transform: rotateY(180deg);
    transform: rotateY(180deg);
}
.cam-shoot .video-container canvas,
.cam-shoot .video-mask canvas {
    display: none !important;
    /* width: 192px;
    height: 192px; */
    -webkit-transform: scaleX(-1); /* mirror effect while using front cam */
    transform: scaleX(-1);         /* mirror effect while using front cam */
}



.msgError{
    position: absolute;
    top: 25%;
    left: 5%;
    width: 90%;
    border-radius: 5px;
    background-color: red;
    color: #fff;
    padding: 10px;
    font-size: .95rem;
    text-align: left;
    height: 300px;
    overflow-y: scroll;
    opacity: .85;
    z-index: 3;
    word-wrap: break-word;
}
/*======================================*/
/*======================================*/
/*======================================*/
/*======================================*/
/*======================================*/
/*======================================*/
/*======================================*/
/*======================================*/
/*======================================*/
/*======================================*/
.cam-shoot .mask{
    position: absolute;
    top: 0;
    left: 0;
    display: grid;
    /* background-color: orange; */
    
    width: 100%;
    height: 100%;
    z-index: 2;
    grid-auto-flow: row;
    grid-template-rows: auto 1fr 1fr 1fr;
}
.cam-shoot.landscape2 .mask{
    /* transform-origin: top right;
    transform: rotate(-90deg);
    margin-left: calc( var(--cs-sh) * -1); */
    width: var(--cs-sh);
    height: var(--cs-sw);
    /* background: rgb(0, 255, 76); */
    
}
.cam-shoot.landscape2 .mask,
.cam-shoot.landscape2.l90 .mask{
    transform-origin: top right;
    transform: rotate(-90deg);
    margin-left: calc( var(--cs-sh) * -1);
}
.cam-shoot.landscape2.l-90 .mask{
    transform-origin: top left;
    transform: rotate(90deg);
    margin-left: calc( var(--cs-sw) - 31px);
}
.cam-shoot .mask .close-btn{
    z-index: 3;
    position: absolute;
    right: .55rem;
    top: .6rem;
    width: 1.5rem;
    height: 1.5rem;
    padding: 1rem;
    /* color: var(--bs-btn-close-color); */
    /* background: transparent var(--bs-btn-close-bg) center/1em auto no-repeat; */
    border: 0;
    border-radius: 1rem;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23000'%3e%3cpath d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/%3e%3c/svg%3e");
    background-color: #fff;
    background-size: 60%;
    background-repeat: no-repeat;
    background-position: center;
    cursor: pointer;
}
.cam-shoot .mask .head-title{
    width: 100%;
    background-color: var(--cs-head-color);
    color:#fff;
    height: 50px;
    line-height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    position: relative;
    z-index: 2;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;
}

.cam-shoot .mask .changing{
    position:absolute;
    top: 9%;
    left: 0;
    width: 100%;
    z-index: 3;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
}
.cam-shoot .mask .changing>span{
    background-color: #282828;
    opacity: .7;
    color:#fff;
    border-radius: 6px;
    padding: 3px 8px;
}
.cam-shoot .mask .focus-aim{
    position: absolute; 
    top:0; 
    right:0;
    bottom:0;
    left:0;
    display: flex;
    align-items: start;/* center; */
    justify-content: center;
}
.cam-shoot .mask .focus-aim .selfie-aim{
    width: 250px;
    height: 250px;
    position: absolute;
    margin-top: 50%;
    position: relative;
}
.cam-shoot .mask .focus-aim .selfie-aim>div{
    position:absolute;
    width:75px;
    height:75px;
    border: 5px solid var(--cs-item-color);;
}
.cam-shoot .mask .focus-aim .selfie-aim > div:nth-child(1){
    left:0;
    top:0;
    border-right: none;
    border-bottom: none;
}
.cam-shoot .mask .focus-aim .selfie-aim > div:nth-child(2){
    right:0;
    top:0;
    border-left: none;
    border-bottom: none;
}

.cam-shoot .mask .focus-aim .selfie-aim > div:nth-child(3){
    left:0;
    bottom:0;
    border-right: none;
    border-top: none;
}
.cam-shoot .mask .focus-aim .selfie-aim > div:nth-child(4){
    right:0;
    bottom:0;
    border-left: none;
    border-top: none;
}
.cam-shoot .mask .focus-aim .doc-aim{
    position:absolute;
    top: 23%;
    width: 75%;
    height: 55%;
    border: 5px solid var(--cs-item-color);
    opacity: .6;
    border-radius: 8px;
}
.cam-shoot .mask .focus-aim .doc-aim.doc-front::before{
    content: '';
    position:absolute;
    top: 0;
    width: 150px;
    height: 120px;
    border: 5px solid var(--cs-item-color);
    right: 0;
    margin-right: -5px;
    margin-top: -5px;
    border-top-right-radius: 8px;
    border-bottom-left-radius: 8px;
}
.cam-shoot .mask .config{
    /* background-color: pink; */
}
.cam-shoot .mask .controls{
    position: absolute;
    width: 100%;
    bottom: 0;
    /* height: 20%; */
    min-height: 150px;
    display: flex;
    /* margin-bottom: 50px; */
    justify-content: center;
    /* background: purple; */
}
.cam-shoot.landscape2 .mask .controls{
    margin-bottom: 1.5rem;
}
.cam-shoot .mask .controls .zoom{
    width: 70%;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.cam-shoot .mask .controls .zoom>input[type="range"]{
    accent-color: var(--cs-item-color) !important;
    width: 100%;
    z-index: 2;
}
.cam-shoot .mask .controls .zoom>span{
    text-align: center;
    /* width: 100%;
    display: block;
    margin-top: -10px; */
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;

    background-color: var(--cs-item-color);
    color: #fff;
    border-radius: 8px;
    padding: 0 9px 0 4px;
    opacity: .9;
    display: inline-flex;
    width: 45px;
    margin-top: 3px;
    margin-left: 8px;
}
.cam-shoot .mask .controls .zoom>span::before{
    content: '\\00a0 ';
}
.cam-shoot .mask .controls .zoom>span::after{
    content: 'x';
}
.cam-shoot.landscape2 .mask .controls .zoom>span{
    transition: transform .5s;
    /* transform: rotate(90deg); */
    margin-top: 7px;
    margin-left: 0;
    padding: 0 3px 1px;
}
.cam-shoot.landscape2 .mask .btnx{
    transition: transform 1s;
}
.cam-shoot.landscape2 .mask .btnx,
.cam-shoot.landscape2 .mask .msgError,
.cam-shoot.landscape2 .mask .controls .zoom>span
.cam-shoot.landscape2 .mask .btnx,
.cam-shoot.landscape2 .mask .msgError,
.cam-shoot.landscape2 .mask .controls .zoom>span{
    transform: rotate(90deg);
}
.cam-shoot.landscape2.l-90 .mask .btnx,
.cam-shoot.landscape2.l-90 .mask .msgError,
.cam-shoot.landscape2.l-90 .mask .controls .zoom>span{
    transform: rotate(-90deg);
}
.cam-shoot .mask .btnx{    
    background-color: var(--cs-item-color) !important;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;
    cursor: pointer;

    display: inline-block;
    padding: 0.375rem 0.75;
    /* font-family: var(--bs-btn-font-family); */
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.5;
    color: #212529;
    text-align: center;
    text-decoration: none;
    vertical-align: middle;
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    border: 1px solid transparent;
    border-radius: 0.375rem;
    background-color: transparent;
    transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    -webkit-appearance: button;
    text-transform: none;
    margin: 0;
    border-radius: 0;
}
.cam-shoot .mask .btnx:active {
    transform: translateY(-1px);
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
}
.cam-shoot .mask .btnx.btn-devices,
.cam-shoot .mask .btnx.btn-devices>select{
    width:70px;
    height:70px;
    border-radius: 35px;
}
.cam-shoot .mask .btnx.btn-devices{
    position:absolute;
    top:13%;
    left:3%;
    /* width:70px;
    height:70px;
    border-radius: 35px; */
    border: none !important;
}
.cam-shoot .mask .btnx.btn-devices>select{
    /* margin-left: -20px;
    margin-top: -12.5px; */
    margin-left: -.5px;
    margin-top: -1px;
    /* width: 70px;
    height: 70px;
    border-radius: 35px; */
    -webkit-appearance: none;
    -moz-appearance: none;
    color: transparent;
    border: none !important;
    cursor: pointer;
    background-color: transparent;
}
.cam-shoot .mask .btnx.btn-devices select::-ms-expand {
    display: none;
}
.cam-shoot .mask .btnx.btn-config{
    position:absolute;
    top:13%;
    right: 3%;
    width:70px;
    height:70px;
    border-radius: 35px;

    background-image: url("data:image/svg+xml,%3Csvg width='800px' height='800px' viewBox='0 0 512 512' version='1.1' xml:space='preserve' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' fill='%23000000'%3E%3Cg stroke-width='0'/%3E%3Cg stroke-linecap='round' stroke-linejoin='round'/%3E%3Cg%3E%3Cg%3E%3Cpath fill='%23fff' d='M161.6,237.5c3.6-1.2,7.5-1.8,11.4-1.8c6.3,0,12.5,1.6,17.9,4.5l13.5-13.5l25.4-25.4l21.2,21.2l34.3-34.3 l-4.4-4.8c19.5-36.7,16.5-83.1-11.2-117.5c-28-34.8-73.2-47.5-113.5-35.7l64.9,80.6l-64.2,51.7L92.2,81.9 c-20.1,36.9-17.3,83.8,10.7,118.5C118.4,219.7,139.2,232.2,161.6,237.5z'/%3E%3Cpath fill='%23fff' d='M332.1,239.4L300,271.5l21.2,21.2l-37.1,37.1l-1.7,1.7L364.7,448c19.5,27.6,58.2,33,84.5,11.8 c26.3-21.2,29.3-60.1,6.5-85.1L332.1,239.4z'/%3E%3Cpath fill='%23fff' d='M263.5,330.5L263.5,330.5L192,259v0l-2.4-2.4c-9.1-9.1-23.9-9.1-33,0L43.4,369.8c-9.1,9.1-9.1,23.9,0,33 l76.4,76.4c9.1,9.1,23.9,9.1,33,0L266,366c9.1-9.1,9.1-23.9,0-33L263.5,330.5z'/%3E%3Cpath fill='%23e0e0e0' d='M471.7,110.9l-48.2,48.2c-5,5-13.2,5-18.2,0l-6.3-6.3L322.6,229l-42.5,42.4l21.2,21.2l-27.2,27.2l-0.8,0.8 l-4.1-4.1L206,253.2v0l-4.1-4.1l12.4-12.4l15.5-15.5l21.2,21.2l43.8-43.8l75-75l-6.3-6.3c-5-5.1-5-13.2,0-18.2l48.2-48.2 c5-5,13.2-5,18.2,0l41.8,41.8C476.7,97.7,476.7,105.8,471.7,110.9z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 50%;
}
.cam-shoot .mask .btnx.btn-flash{
    position:absolute;
    bottom:10%;
    left:5%;
    width:70px;
    height:70px;
    border-radius: 35px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 448 512' fill='%23fff'%3E%3Cpath d='M349.4 44.6c5.9-13.7 1.5-29.7-10.6-38.5s-28.6-8-39.9 1.8l-256 224c-10 8.8-13.6 22.9-8.9 35.3S50.7 288 64 288H175.5L98.6 467.4c-5.9 13.7-1.5 29.7 10.6 38.5s28.6 8 39.9-1.8l256-224c10-8.8 13.6-22.9 8.9-35.3s-16.6-20.7-30-20.7H272.5L349.4 44.6z'/%3E%3C/svg%3E");
    /* <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor"><path d="M349.4 44.6c5.9-13.7 1.5-29.7-10.6-38.5s-28.6-8-39.9 1.8l-256 224c-10 8.8-13.6 22.9-8.9 35.3S50.7 288 64 288H175.5L98.6 467.4c-5.9 13.7-1.5 29.7 10.6 38.5s28.6 8 39.9-1.8l256-224c10-8.8 13.6-22.9 8.9-35.3s-16.6-20.7-30-20.7H272.5L349.4 44.6z"/></svg> */
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: 50%;
}
.cam-shoot .mask .btnx.btn-flash.lights-on{
    background-color: gold !important;
}
.cam-shoot .mask .btnx.btn-shoot{
    position:absolute;
    bottom:10%;
    left:calc(50% - 35px);
    width:70px;
    height:70px;
    border-radius: 35px;
}
.cam-shoot .mask .btnx.btn-change{
    position:absolute;
    bottom:10%;
    right:5%;
    width:70px;
    height:70px;
    border-radius: 35px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' fill='%23fff'%3E%3Cpath d='M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM384 256c0 8.8-7.2 16-16 16H291.3c-6.2 0-11.3-5.1-11.3-11.3c0-3 1.2-5.9 3.3-8L307 229c-13.6-13.4-31.9-21-51-21c-19.2 0-37.7 7.6-51.3 21.3L185 249c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l19.7-19.7C193.4 172.7 224 160 256 160c31.8 0 62.4 12.6 85 35l23.7-23.7c2.1-2.1 5-3.3 8-3.3c6.2 0 11.3 5.1 11.3 11.3V256zM128 320c0-8.8 7.2-16 16-16h76.7c6.2 0 11.3 5.1 11.3 11.3c0 3-1.2 5.9-3.3 8L205 347c13.6 13.4 31.9 21 51 21c19.2 0 37.7-7.6 51.3-21.3L327 327c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-19.7 19.7C318.6 403.3 288 416 256 416c-31.8 0-62.4-12.6-85-35l-23.7 23.7c-2.1 2.1-5 3.3-8 3.3c-6.2 0-11.3-5.1-11.3-11.3V320z'/%3E%3C/svg%3E");
    /* <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM384 256c0 8.8-7.2 16-16 16H291.3c-6.2 0-11.3-5.1-11.3-11.3c0-3 1.2-5.9 3.3-8L307 229c-13.6-13.4-31.9-21-51-21c-19.2 0-37.7 7.6-51.3 21.3L185 249c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l19.7-19.7C193.4 172.7 224 160 256 160c31.8 0 62.4 12.6 85 35l23.7-23.7c2.1-2.1 5-3.3 8-3.3c6.2 0 11.3 5.1 11.3 11.3V256zM128 320c0-8.8 7.2-16 16-16h76.7c6.2 0 11.3 5.1 11.3 11.3c0 3-1.2 5.9-3.3 8L205 347c13.6 13.4 31.9 21 51 21c19.2 0 37.7-7.6 51.3-21.3L327 327c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-19.7 19.7C318.6 403.3 288 416 256 416c-31.8 0-62.4-12.6-85-35l-23.7 23.7c-2.1 2.1-5 3.3-8 3.3c-6.2 0-11.3-5.1-11.3-11.3V320z"/></svg> */
    background-position: 50%;
    background-repeat: no-repeat;
    background-size: 50%;
}
.btn-change:active{
    -webkit-transform: rotateY(180deg);
    transform: rotateY(180deg);
}
.cam-shoot .mask .btnx.opaque:not(.not-available){
    pointer-events: none;
    /* background-color: #97bccd !important; */
    opacity: .75;;
}
.cam-shoot .mask .btnx.not-available{
    pointer-events: none;
    background-color: rgb(151, 151, 151) !important;
    /* background-color: grey var(--cs-item-color); */
}`
})
export class NgxCamShoot {
  @Output() sendImage = new EventEmitter<string|null>();
  
  private stream!: MediaStream | undefined;

  modalCapture: boolean = false;
  
  isCaptured: boolean = false;
  imageCaptured!: string | undefined;
  error: string = '';
  debug: string = '';

  @ViewChild("videoImage") public video!: ElementRef<HTMLVideoElement>;
  @ViewChild("canvasImage") public canvas!: ElementRef<HTMLCanvasElement>;

  @Input() config!: ICamShootConfig;

  @Input() canChangeMode: boolean = true;
  @Input() type: eCamShootType = eCamShootType.DEFAULT;
  @Input() color: string = '#282828';
  @Input() displayTitle: boolean = !0;
  @Input() title: string = 'Capture image';
  @Input() showFaceMode: boolean = false;
  @Input() usePreview: boolean = true;
  @Input() showErrors: boolean = false;
  @Input() debugMode: boolean = false;
  @Input() btnTakeAnother: string = 'Take another';
  @Input() btnAcceptCapture: string = 'Accept capture';

  havePermissions: boolean = false;
  isChangingDevice: boolean = false;

  faceMode: eCamShootFaceMode = eCamShootFaceMode.USER;
  
  canUseFlash: boolean = false;
  canActiveFlash: boolean = false;
  isFlashActive: boolean = false;

  //private zoomSubs!: Subscription;
  zoom = new FormControl<number|null>(null);
  zoomConfig: IZoomConfig = {min:-1,max:10,step:2};
  canUseZoom: boolean = false;
  canActiveZoom: boolean = false;

  devices: ICamShootDevice[] = [];
  //private deviceSubs!: Subscription;
  device = new FormControl<string|null>(null);

  displayPreview: boolean = false;

  isMobile: boolean = false;
  hasTouchSupport: boolean = false;
  isLandscape: boolean = false;
  orientationDegs: number = 0;
  screen_w: number = 0;
  screen_h: number = 0;

  fullScreenStart: boolean = false;

  private maxTryStream: number = 25;

  @HostListener('window:resize')
  resize(){
    this.debug += "[resize] start.\n";
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.hasTouchSupport = this.hasTouch(navigator); //'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.isLandscape = window.matchMedia("(orientation: landscape)").matches && this.hasTouchSupport;
    //this.isLandscape = screen.availHeight < screen.availWidth;
    if(this.isLandscape && window.orientation!=undefined){
      this.orientationDegs = window.orientation;
      this.debug += "[resize] have orientation: ",window.orientation,"\n";
    }else{
      this.orientationDegs = 0;
    }
    this.screen_w = screen.availWidth;
    this.screen_h = screen.availHeight;
    this.debug += "[resize] screen "+this.screen_w+"x"+this.screen_h+".\n";
  }

  constructor() {
    this.initConfig(this.config)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['canChangeMode']){
      console.log('canChangeMode',changes['canChangeMode'].currentValue)
      this.canChangeMode = changes['canChangeMode'].currentValue;
    }
    if(changes['type']){
      if(this.type==eCamShootType.SELFIE && !this.canChangeMode){
        this.faceMode = eCamShootFaceMode.USER;
      }else{
        this.faceMode = eCamShootFaceMode.ENVIRONMENT;
      }
      if(!changes['type'].firstChange){
        this.device.reset();
        this.clear();
        this.initDevices();
      }
    }
  }

  ngOnInit() {
    this.resize();
    /* this.deviceSubs = */ this.device.valueChanges.subscribe((v)=>{
      if(v==null) return;
      console.log('device changed',v)
      this.debug += "[ngOnInit] device value changes.\n";
      this.isChangingDevice = true;
      this.clearAndLoadDevices();
      this.checkDeviceMode(v);
    });
    /* this.zoomSubs = */ this.zoom.valueChanges.subscribe((v)=>{
      if(v!=null){
        this.updateZoom(v);
      }
    })
  }

  private initConfig(config: ICamShootConfig){
    if(config==undefined) return;
    this.displayTitle = config.displayTitle??this.displayTitle;
    this.title = config.title??this.title;
    this.showFaceMode = config.showFaceMode??this.showFaceMode;
    this.canChangeMode = config.canChangeMode??this.canChangeMode;
    this.type = config.type??this.type;
    this.color = config.color??this.color;
    this.usePreview = config.usePreview??this.usePreview;
    this.btnTakeAnother = config.btnTakeAnother??this.btnTakeAnother;
    this.btnAcceptCapture = config.btnAcceptCapture??this.btnAcceptCapture;
  }

  initCapture(faceMode: eCamShootFaceMode = eCamShootFaceMode.USER){
    this.debug += "[initCapture] start;\n";
    this.isChangingDevice = true;
    this.modalCapture = true;
    this.faceMode = faceMode;
    this.debug += "[initCapture] modalCapture = true;\n";
    document.getElementsByTagName('body')[0].style.overflowY = 'hidden';
    document.getElementsByTagName('body')[0].focus();

    this.requestPermissions();
  }
  takeCapture(){
    this.modalCapture = false;
    document.getElementsByTagName('body')[0].style.overflowY = 'auto';
    this.drawImageToCanvas(this.video.nativeElement);
  }
  takeAnother(){
    this.debug += "[takeAnother] start;\n";
    this.clear();
    this.initCapture(this.faceMode);
  }
  sendCapture(){
    this.cancelFullScreen();
    this.send();
    this.clear();
  }

  close(){
    this.cancelFullScreen();
    this.modalCapture = false;
    
    this.devices = [];
    this.device.reset(null,{emitEvent:false});
    /* this.deviceSubs.unsubscribe();
    this.zoomSubs.unsubscribe(); */
    this.clear();
  }
  private clearAndLoadDevices(){
    this.clear();
    setTimeout(()=>{
      this.loadDevices();
    },250)
  }
  private clear(){
    this.debug += "[clear] start.\n";
    this.imageCaptured = undefined;
    this.isCaptured = false;

    this.canUseFlash = false;
    this.canActiveFlash = false;
    this.isFlashActive = false;

    this.canUseZoom = false;
    this.canActiveZoom = false;

    this.displayPreview = false;

    try{
      const webcam = this.video.nativeElement;
      if(webcam){
        this.debug += "[clear] exist video, setting pause, empty and null.\n";
        webcam.pause();
        webcam.src = "";
        webcam.srcObject = null;
      }
    } catch (e: any) {
      this.debug += "[clear] webcam error: "+e.message+", setting pause, empty and null.\n";
      this.error += "[clear] webcam error: "+e.message+", setting pause, empty and null.\n";
    }

    if(this.stream===undefined) return;

    try{
      let me = this;
      this.stream.getTracks().forEach(function(track) {
        me.debug += "[clear] getTracks(), id: "+track.id+".\n";
        if (track.readyState == 'live' && track.kind === 'video') {
          me.debug += "[clear] stopping track id: "+track.id+".\n";
          track.stop();
          /* if(me.stream!=undefined){
            me.stream.removeTrack(track);
          } */
        }
      });
      this.debug += "[clear] set stream to undefined.\n";
      this.stream = undefined;
    } catch (e: any) {
      console.log('[STRM] '+e.message)
    }
  }

  drawImageToCanvas(image: any) {
    let ctx = this.canvas.nativeElement.getContext("2d");
    //console.log('draw type',this.type)
    
    //const webcam = document.getElementById('videocap') as HTMLVideoElement;//functional
    const webcam = this.video.nativeElement;

    /* if(this.type!=eCamShootType.SELFIE){

      this.canvas.nativeElement.width = webcam.videoHeight;
      this.canvas.nativeElement.height = webcam.videoWidth;

      ctx.save(); 

      ctx.translate(webcam.videoHeight/2, webcam.videoWidth/2);
      ctx.rotate(-90 * Math.PI/180);
      ctx.drawImage(image, -(webcam.videoWidth/2), -(webcam.videoHeight/2));
      ctx.restore();
    }else{
      this.canvas.nativeElement.width = webcam.videoWidth;
      this.canvas.nativeElement.height = webcam.videoHeight;
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, this.canvas.nativeElement.width*-1, this.canvas.nativeElement.height);
    } */

    /* if(this.type==eCamShootType.SELFIE){
      if(this.faceMode==eCamShootFaceMode.USER){
        this.canvas.nativeElement.width = webcam.videoWidth;
        this.canvas.nativeElement.height = webcam.videoHeight;
        ctx.scale(-1, 1);
        ctx.drawImage(image, 0, 0, this.canvas.nativeElement.width*-1, this.canvas.nativeElement.height);
      }else{
        this.canvas.nativeElement.width = webcam.videoWidth;
        this.canvas.nativeElement.height = webcam.videoHeight;
        ctx.drawImage(image, 0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
      }
    }else{
      this.canvas.nativeElement.width = webcam.videoHeight;
      this.canvas.nativeElement.height = webcam.videoWidth;

      ctx.save(); 

      ctx.translate(webcam.videoHeight/2, webcam.videoWidth/2);
      ctx.rotate(-90 * Math.PI/180);
      ctx.drawImage(image, -(webcam.videoWidth/2), -(webcam.videoHeight/2));
      ctx.restore();
    } */


    //is front
    if(this.faceMode==eCamShootFaceMode.USER){
      this.canvas.nativeElement.width = webcam.videoWidth;
      this.canvas.nativeElement.height = webcam.videoHeight;
      ctx?.scale(-1, 1);
      ctx?.drawImage(image, 0, 0, this.canvas.nativeElement.width*-1, this.canvas.nativeElement.height);
    }else{
      //is back
      //without focus marker
      if(this.type==eCamShootType.DEFAULT){
          this.canvas.nativeElement.width = webcam.videoWidth;
          this.canvas.nativeElement.height = webcam.videoHeight;
          ctx?.drawImage(image, 0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
      }else{
        //shoot document (rotate)
        this.canvas.nativeElement.width = webcam.videoHeight;
        this.canvas.nativeElement.height = webcam.videoWidth;

        ctx?.save(); 

        ctx?.translate(webcam.videoHeight/2, webcam.videoWidth/2);
        ctx?.rotate(-90 * Math.PI/180);
        ctx?.drawImage(image, -(webcam.videoWidth/2), -(webcam.videoHeight/2));
        ctx?.restore();
      }
    }
    
    this.imageCaptured = this.canvas.nativeElement.toDataURL("image/png")
    this.isCaptured = true;

    if(!this.usePreview){
      this.sendCapture();
    }else{
      this.displayPreview = true;
    }

  }
  private send(){
    this.sendImage.emit(this.imageCaptured);
  }

  async initDevices() {
    this.debug += "[initDevices] start;\n";

    if(this.devices.length>0){
      this.debug += "[initDevices] devices previously loaded, continue to loadDevices();\n";
      this.loadDevices();
      return
    }

    this.devices = [];
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia!=undefined) {
      this.debug += "[initDevices] navigator.mediaDevices exist.\n";

      await navigator
      .mediaDevices
      .enumerateDevices()
      .then(devices => {
        this.debug += "[initDevices] enumerateDevices() executed.\n";

        const videoDevies = devices.filter((d)=>d.kind=='videoinput');
        this.debug += "[initDevices] enumerateDevices() found "+videoDevies.length+" video devices.\n";
        
        videoDevies.forEach((device,i) => {
          this.debug += "[initDevices] enumerateDevices() forEach index: "+i+".\n";
          this.pushDevice(device);
        });

        if(this.devices.length==0){
          this.debug += "[initDevices] don't have camera devices.\n";
          this.error += "No posees una entrada de camara.\n";
        }else{
          if(this.devices[0].deviceId==''){
            this.debug += "[initDevices] device default is empty, you don't have permissons, go to loadDevices().\n";
            this.loadDevices();
            return;
          }
          this.assignDevice();
        }
      });
    }else{
      this.debug += "[initDevices] navigator.mediaDevices don't exist.\n";
      this.error += "No tienes acceso a los dispositivos.\n";
    }
      
  }

  cancelFullScreen(){
    this.debug += "[cancelFullScreen] start.\n";
    var el: any = document;

    var cancelFullScreenMethod = el.exitFullscreen || el.webkitExitFullscreen
    || el.mozCancelFullScreen || el.msExitFullscreen;

    if (cancelFullScreenMethod && el.fullscreenElement) {
      this.debug += "[cancelFullScreen] executed.\n";
      
      cancelFullScreenMethod.call(el);
      this.resize();
    }
  }
  requestFullScreen() {
    this.debug += "[requestFullScreen] start.\n";
    var el: any = document.body;
  
    var requestMethod = el.requestFullScreen || el.webkitRequestFullScreen 
    || el.mozRequestFullScreen || el.msRequestFullScreen;
  
    if (requestMethod) {
      this.debug += "[requestFullScreen] executed on body.\n";
      requestMethod.call(el);
      this.debug += "[requestFullScreen] go to resize().\n";
      this.resize();
    }
  }

  private async requestPermissions(){
    //for safary (ios)
    //<meta name="viewport" content="minimal-ui, width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    /* let body: any = document.querySelector("body");
    body.requestFullscreen().then(() => {
      //document.querySelector("body").style.overflow = "auto";
      this.debug += "[requestPermissions] se dio permiso de pantalla.\n";
    }); */
    this.debug += "[requestPermissions] start.\n";
    if(this.havePermissions){
      this.requestFullScreen();
      this.debug += "[requestPermissions] the session already have permissions, go to initDevices().\n";
      this.initDevices();
      return;
    }
    try {
      let constraints: any = {
        width: {min: 640, ideal: 1280, max: 1920},
        height: {min: 480, ideal: 720},
        focusMode: 'continuous'
      };
      await navigator
      .mediaDevices
      .getUserMedia({
        video:constraints
      })
      .then((stream) => {
        this.havePermissions = true;
        this.requestFullScreen();
        this.debug += "[requestPermissions] permissions granted, go to initDevices().\n";
        this.initDevices();
      })
      .catch((err) => {
        this.havePermissions = false;
        this.debug += "[requestPermissions] permissions fail: "+err+".\n";
        console.error(`you got an error: ${err}`);
      });
    } catch (e) {
      this.debug += "[requestPermissions] catch: "+JSON.stringify(e)+".\n";
      console.log('[ERR] '+e)
    }
  }

  private assignDevice(){
    this.debug += "[assignDevice] start.\n";
    this.debug += "[assignDevice] devices existing: "+this.devices.length+".\n";
    this.debug += "[assignDevice] faceMode: "+this.faceMode+".\n";
    if(this.devices.length==1){
      this.debug += "[assignDevice] only have 1 device.\n";
      const firstDevice = this.devices[0];
      this.device.setValue(firstDevice.deviceId,{emitEvent:false});
      if(this.faceMode==eCamShootFaceMode.ENVIRONMENT){
        this.debug += "[assignDevice] faceMode=ENVIRONMENT on 1 device, probably has laptop or pc, go to changeMode().\n";
        this.toogleMode();
        return;
      }
    }else if(this.faceMode==eCamShootFaceMode.ENVIRONMENT){
      this.debug += "[assignDevice] faceMode=ENVIRONMENT.\n";
      if(this.getBackDevices().length>0){
        this.debug += "[assignDevice] set ENVIRONMENT mode device.\n";
        this.device.setValue(this.getBackDevices()[0].deviceId,{emitEvent:false});
      }else{
        this.debug += "[assignDevice] ENVIRONMENT devices=0. Executing changeMode().\n";
        this.toogleMode();
        return;
      }
    }else{
      this.debug += "[assignDevice] set USER mode device.\n";
      this.device.setValue(this.getFrontDevices()[0].deviceId,{emitEvent:false});
    }
    this.debug += "[assignDevice] execute loadDevices().\n";
    this.loadDevices();
  }
  private async loadDevices(count: number = 1){
    this.debug += "[loadDevices]"+(count>1?'[number '+count+"]":'')+" start.\n";

    const iWidth = this.screen_h;//this.isLandscape?this.screen_w:this.screen_h;
    const iHeight = this.screen_w;//this.isLandscape?this.screen_h:this.screen_w;
    
    let videoConstraints: MediaTrackConstraints|any = {
      /* width: {min: 640, ideal: 1280, max: 1920},
      height: {min: 480, ideal: 720, max: 1080}, */
      /* width: this.screen_h,
      height: this.screen_w, */
      width: iWidth,
      height: iHeight,
      focusMode: 'continuous'
    }
    if(this.device.value!=null && this.device.value!=''){
      this.debug += "[loadDevices] devices has been set, init constraints with deviceId: "+this.device.value+".\n";
      videoConstraints = {
        ...videoConstraints,
        deviceId: { exact: this.device.value }
      }
    }else{
      this.debug += "[loadDevices] devices has not been set, init constraints with faceMode.\n";
      videoConstraints = {
        ...videoConstraints,
        facingMode: this.faceMode
      }
    }
    if (this.stream==undefined) {
      this.debug += "[loadDevices] stream is undefined.\n";
    }

    this.startStream({video: videoConstraints});
  }

  private async startStream(constraints: MediaStreamConstraints, count: number = 1){
    this.debug += "[startStream] start.\n";
    this.debug += "[startStream] constraints: "+JSON.stringify(constraints)+".\n";
    navigator.mediaDevices.getUserMedia(constraints)
    .then((stream)=>{
      this.isChangingDevice = false;
      this.stream = stream;
      this.debug += "[startStream] stream has been initialized.\n";
      
      this.checkFlash(this.device.value);
      this.checkZoom();

      this.debug += "[startStream] initialize handleStream.\n";
      this.handleStream(stream);
    },(reason: any)=>{
      this.debug += "[startStream] getUserMedia fail: "+reason+".\n";
      if(count>this.maxTryStream){
        this.isChangingDevice = false;
        this.debug += "[startStream] getUserMedia fail. More than 20 times has been tried to start stream and fail.\n";
        return;
      }
      this.debug += "[startStream] getUserMedia fail. Try "+count+" time in .25s.\n";
      setTimeout(()=>{
        this.startStream(constraints,count+1);
      },250)
    })
  }
  private handleStream(stream: MediaStream | undefined){
    this.debug += "[handleStream] start.\n";
    if(stream==undefined){
      this.debug += "[handleStream] stream is undefined, cancel action.\n";
      return;
    }

    const webcam = this.video.nativeElement;
    webcam.srcObject = stream;

    if(this.device.value==null || this.device.value==''){
      this.debug += "[handleStream] device is null or empty.\n";
      setTimeout(()=>{
        this.debug += "[handleStream] executing setTimeout to initDevices().\n";
        this.initDevices();
      },500)
    }

    webcam.onloadedmetadata = async (event) => {
      try {
        this.debug += "[handleStream] video sizes "+webcam.videoWidth+"x"+webcam.videoHeight+".\n";
        await webcam.play();
      } catch (e) {
        console.error(e)
      }
    }
  }

  toogleMode(){
    this.debug += "[changeMode] start.\n";
    
    const fm = this.faceMode;
    this.debug += "[changeMode] current faceMode: "+fm+".\n";
    this.faceMode = this.faceMode==eCamShootFaceMode.USER?eCamShootFaceMode.ENVIRONMENT:eCamShootFaceMode.USER;
    this.debug += "[changeMode] new faceMode: "+this.faceMode+".\n";
    
    let canContinue: boolean = false;
    if(this.faceMode==eCamShootFaceMode.ENVIRONMENT && this.getBackDevices().length>0){
      canContinue = true;
    }else if(this.faceMode==eCamShootFaceMode.USER && this.getFrontDevices().length>0){
      canContinue = true;
    }
    if(!canContinue){
      this.debug += "[changeMode] don't have devices to change, cancel action.\n";
      return;
    }
    this.isChangingDevice = true;
    if(this.faceMode==eCamShootFaceMode.ENVIRONMENT){
      this.debug += "[changeMode] faceMode = ENVIRONMENT.\n";
      this.debug += "[changeMode] ENVIRONMENT devices: "+this.getBackDevices().length+".\n";
      this.device.setValue(this.getBackDevices()[0].deviceId,{emitEvent:false});
    }else{
      this.debug += "[changeMode] faceMode = USER.\n";
      this.debug += "[changeMode] USER devices: "+this.getFrontDevices().length+".\n";
      this.device.setValue(this.getFrontDevices()[0].deviceId,{emitEvent:false});
    }
    this.clearAndLoadDevices();
  }

  private checkFlash(deviceId: string | null){
    this.debug += "[checkFlash] start.\n";
    if(this.stream==undefined) return;
    let track = this.stream.getVideoTracks()[0];
    if(!track.getCapabilities){
      this.debug += "[checkFlash] track can't use capabilities.\n";
      this.canUseFlash = false;
      this.canActiveFlash = false;
      return;
    }
    this.canUseFlash = true;
    this.canActiveFlash = 'torch' in track.getCapabilities()
    if(deviceId!=null && this.canActiveFlash){
      this.debug += "[checkFlash] device canActiveFlash = true.\n";
      this.setDeviceFlash(deviceId,this.canActiveFlash);
    }
    this.debug += "[checkFlash] canActiveFlash: "+this.canActiveFlash+".\n";
  }
  private setDeviceFlash(deviceId: string, torch: boolean){
    this.debug += "[setDeviceFlash] start.\n";
    let dev = this.devices.find((e)=>e.deviceId==deviceId);
    this.debug += "[setDeviceFlash] find on devices, where deviceId: "+deviceId+".\n";
    if(dev!=undefined){
      this.debug += "[setDeviceFlash] device found, set haveTorch to: "+torch+".\n";
      dev.haveTorch = torch;
    }
  }
  toogleFlash(){
    this.debug += "[toogleFlash] start.\n";
    if(this.stream==undefined) return;

    const track: MediaStreamTrack = this.stream.getVideoTracks()[0];

    this.isFlashActive = !this.isFlashActive;
    this.debug += "[toogleFlash] applyAdvanceConstraint torch to "+this.isFlashActive+".\n";
    this.applyAdvanceConstraint({torch: this.isFlashActive});
  }
  private checkZoom(){
    this.debug += "[checkZoom] start.\n";
    if(this.stream==undefined) return;
    const prev = this.canUseZoom;
    let track = this.stream.getVideoTracks()[0];
    if(!track.getCapabilities){
      this.debug += "[checkZoom] track can't use capabilities.\n";
      this.canUseZoom = false;
      return;
    }
    this.canUseZoom = true;
    this.canActiveZoom = 'zoom' in track.getCapabilities()
    this.debug += "[checkZoom] canActiveZoom: "+this.canActiveZoom+".\n";
    this.zoomConfig = (track.getCapabilities() as any).zoom;
    if(this.zoomConfig!=undefined){
      this.zoom.setValue(this.zoomConfig.min);
    }
  }
  private updateZoom(zoom: number){
    this.debug += "[updateZoom] start.\n";
    if(this.zoomConfig==undefined){
      this.debug += "[updateZoom] zoomConfig is undefined, cancel.\n";
    }
    this.debug += "[updateZoom] applyAdvanceConstraint zoom to "+zoom+".\n";
    this.applyAdvanceConstraint({zoom:zoom});
  }
  private applyAdvanceConstraint(constraint: MediaTrackConstraintSet | any){
    this.debug += "[applyAdvanceConstraint] start.\n";
    if(this.stream==undefined){
      this.debug += "[applyAdvanceConstraint] stream is undefined.\n";
      return;
    }

    const track: MediaStreamTrack = this.stream.getVideoTracks()[0];
    this.debug += "[applyAdvanceConstraint] constraint set: "+JSON.stringify(constraint)+".\n";
    const constraints: MediaTrackConstraints | any = {
      advanced: [constraint]
    }
    track.applyConstraints(constraints)
    .then(() => {
      this.debug += "[applyAdvanceConstraint] constraints has been applied.\n";
    })
    .catch(e => {
      this.debug += "[applyAdvanceConstraint] constraints not has been applied.\n";
    });
  }
  getZoomPercent(): string{
    const zoomVal = this.zoom.value;
    if(zoomVal==null || zoomVal==this.zoomConfig.min) return '1.0';
    console.log('getZoomPercent',zoomVal)
    return ((zoomVal)/this.zoomConfig.min).toFixed(1);
  }

  private checkDeviceMode(deviceId: any){
    this.debug += "[checkDeviceMode] start.\n";
    let device = this.devices.filter((e)=>e.deviceId==deviceId)[0];
    let isFrontDev = this.isFront(device.label);
    if(isFrontDev!=device.isFront){
      this.debug += "[checkDeviceMode] faceMode front device not match, changing.\n";
      this.faceMode = isFrontDev?eCamShootFaceMode.USER:eCamShootFaceMode.ENVIRONMENT;
    }
  }
  private isFront(label: string){
    return label.match(/back|trasera/i)===null;
  }

  private getFrontDevices(): ICamShootDevice[]{
    return this.devices.filter(e=>e.isFront)
  }
  private getBackDevices(): ICamShootDevice[]{
    return this.devices.filter(e=>!e.isFront)
  }
  get hasMultipleDevicesOnMode(): boolean{
    if(this.faceMode==eCamShootFaceMode.USER){
      return this.getFrontDevices().length>1;
    }
    if(this.faceMode==eCamShootFaceMode.ENVIRONMENT){
      return this.getBackDevices().length>1;
    }
    return false;
  }

  private pushDevice(device: MediaDeviceInfo){
    this.debug += "[pushDevice] start.\n";
    const isFrontDev = this.isFront(device.label);
    let devLabel = device.label;
    if(device.label==''){
      devLabel = `Cam ${isFrontDev?'user':'env'} ${this.devices.filter((e)=>e.isFront==isFrontDev).length+1}`;
    }

    const dev = {
      isFront: isFrontDev,
      mode: (isFrontDev?eCamShootFaceMode.USER:eCamShootFaceMode.ENVIRONMENT),
      label: devLabel,
      deviceId: device.deviceId,
      haveTorch: false
    }
    
    this.debug += "[pushDevice] push:"+JSON.stringify(dev)+".\n";
    this.devices.push(dev);
  }

  private hasTouch(navigator: Navigator|any): boolean{
    if ("maxTouchPoints" in navigator) {
      return navigator.maxTouchPoints > 0;
    } else if ("msMaxTouchPoints" in navigator) {
      return navigator.msMaxTouchPoints > 0;
    } else {
      const mQ = matchMedia?.("(pointer:coarse)");
      if (mQ?.media === "(pointer:coarse)") {
        return !!mQ.matches;
      } else if ("orientation" in window) {
        return true; // deprecated, but good fallback
      } else {
        // Only as a last resort, fall back to user agent sniffing
        const UA: string = navigator.userAgent;
        return /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
          /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA);
      }
    }
  }

  getErrors(): string{
    return this.showErrors?this.error.replace(/\n/g, "<br />"):'';
  }
  getDebugInfo(): string{
    return this.debugMode?this.debug.replace(/\n/g, "<br />"):'';
  }
  getStyleConfig(): string{
    return `--cs-sw: ${this.screen_w}px; --cs-sh: ${this.screen_h}px; --cs-head-color: ${this.color}; --cs-item-color: ${this.color};`;
  }

  isDefault(){
    return this.type==eCamShootType.DEFAULT;
  }
  isSelfie(){
    return this.type==eCamShootType.SELFIE;
  }
  isDocument(){
    return this.type==eCamShootType.DOCFRONT || this.type==eCamShootType.DOCBACK;
  }
  isDocFront(){
    return this.type==eCamShootType.DOCFRONT;
  }
}
