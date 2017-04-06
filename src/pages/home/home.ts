import { Component } from '@angular/core';

import { NavController } from 'ionic-angular';

import { IMicTimerConfig } from '../../shared/components/d3gauge/d3micTimerConfig.interface';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  // variables for micTimer component
  micTimerAction: string;
  micStatus: string;
  //micTimerConfig: IMicTimerConfig;
  startMicTimerBtnDisabled: boolean = false;
  pauseMicTimerBtnDisabled: boolean = true;
  stopMicTimerBtnDisabled: boolean = true;
  warmUpFor: number = 4000;
  countdownFor: number = 7000;
  warningFor: number = 2000;
  warmupUpBtnDisabled: boolean = false;
  countdownUpBtnDisabled: boolean = false;
  warningUpBtnDisabled: boolean = false;
  warmupDownBtnDisabled: boolean = false;
  countdownDownBtnDisabled: boolean = false;
  warningDownBtnDisabled: boolean = false;

  constructor(public navCtrl: NavController) {

  }
  // actions on micTimer component
  onStartMicTimer(){
    //this.micTimerConfig = {
    //  countdownFor: 20000,  // countdown time in ms
    //  warmUpFor: 2000,  // countdown time in ms
    //  warningFor: 3000 // countdown time in ms}
    //};
    this.micTimerAction = "start";
    this.micStatus = 'recording';
    this.startMicTimerBtnDisabled = true;
    this.pauseMicTimerBtnDisabled = false;
    this.stopMicTimerBtnDisabled = false;
  }

  onPauseMicTimer(){
    if (this.micStatus !== "paused") {
      this.micTimerAction = "pause";
      this.micStatus = 'paused';
    } else {
      this.micTimerAction = "unPause";
      this.micStatus = 'recording';
    }
  }

  onStopMicTimer(){
    this.micTimerAction = "stop";
    this.micStatus = 'stopped';

    this.startMicTimerBtnDisabled = false;
    this.pauseMicTimerBtnDisabled = true;
    this.stopMicTimerBtnDisabled = true;
  }

  onFinished() {
    console.log('in home.ts=>onFinished');
    this.micTimerAction = "stopped";
    this.micStatus = 'stopped';
    this.startMicTimerBtnDisabled = false;
    this.pauseMicTimerBtnDisabled = true;
    this.stopMicTimerBtnDisabled = true;
    console.log('in home.ts=>onFinished');
  }

  onWarmupUp(){
    console.log('onWarmupUp');
    this.warmUpFor += 1000;
    console.log(this.warmUpFor);
  }
  onWarmupDown(){
    this.warmUpFor -= 1000;
    this.warmUpFor = Math.max(this.warmUpFor, 0);
  }
  
  onCountdownUp(){
    this.countdownFor += 1000;
  }
  onCountdownDown(){
    this.countdownFor -= 1000;
    this.countdownFor = Math.max(this.countdownFor, 0);
  }

  onWarningUp(){
    this.warningFor += 1000;
  }
  onWarningDown(){
    this.warningFor -= 1000;
    this.warningFor = Math.max(this.warningFor, 0);
  }
  // END actions on micTimer component
}
