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
  micTimerConfig: IMicTimerConfig;
  startMicTimerBtnDisabled: boolean = false;
  pauseMicTimerBtnDisabled: boolean = true;
  stopMicTimerBtnDisabled: boolean = true;
  warmup_for: number = 3000;
  countdown_for: number = 15000;
  warning_for: number = 1000;
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
    this.micTimerConfig = {
      countdown_for: 20000,  // countdown time in ms
      warmup_for: 2000,  // countdown time in ms
      warning_for: 3000 // countdown time in ms}
    };
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
    this.warmup_for += 1000;
    console.log(this.warmup_for);
  }
  onWarmupDown(){
    this.warmup_for -= 1000;
    this.warmup_for = Math.max(this.warmup_for, 0);
  }
  
  onCountdownUp(){
    this.countdown_for += 1000;
  }
  onCountdownDown(){
    this.countdown_for -= 1000;
    this.countdown_for = Math.max(this.countdown_for, 0);
  }

  onWarningUp(){
    this.warning_for += 1000;
  }
  onWarningDown(){
    this.warning_for -= 1000;
    this.warning_for = Math.max(this.warning_for, 0);
  }
  // END actions on micTimer component
}
