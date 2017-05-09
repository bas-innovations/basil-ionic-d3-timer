import { Component } from '@angular/core';

import { NavController } from 'ionic-angular';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  // variables for micTimer component
  ringTimerAction: string;
  micStatus: string;

  warmUpFor: number = 5000;
  countdownFor: number = 20000;
  warningFor: number = 1000;

  startMicTimerBtnDisabled: boolean = false;
  pauseMicTimerBtnDisabled: boolean = true;
  stopMicTimerBtnDisabled: boolean = true;

  // Variables of Disabling Buttons
  warmupUpBtnDisabled: boolean = false;
  countdownUpBtnDisabled: boolean = false;
  warningUpBtnDisabled: boolean = false;
  warmupDownBtnDisabled: boolean = false;
  countdownDownBtnDisabled: boolean = false;
  warningDownBtnDisabled: boolean = false;

  constructor(public navCtrl: NavController) {}

  disableControlBtns(disabled: boolean){
    this.warmupUpBtnDisabled = disabled;
    this.countdownUpBtnDisabled = disabled;
    this.warningUpBtnDisabled = disabled;

    this.warmupDownBtnDisabled = disabled;
    this.countdownDownBtnDisabled = disabled;
    this.warningDownBtnDisabled = disabled;
  }
  // **
  // ** actions on micTimer component
  // **
  onStartMicTimer(){
    this.ringTimerAction = "start";
    this.micStatus = 'recording';
    this.startMicTimerBtnDisabled = true;
    this.pauseMicTimerBtnDisabled = false;
    this.stopMicTimerBtnDisabled = false;
    this.disableControlBtns(true);
  }

  onPauseMicTimer(){
    if (this.micStatus !== "paused") {
      this.ringTimerAction = "pause";
      this.micStatus = 'paused';
    } else {
      this.ringTimerAction = "unPause";
      this.micStatus = 'recording';
    }
  }

  onStopMicTimer(){
    this.ringTimerAction = "stop";
    this.micStatus = 'stopped';

    this.startMicTimerBtnDisabled = false;
    this.pauseMicTimerBtnDisabled = true;
    this.stopMicTimerBtnDisabled = true;
    this.disableControlBtns(false);
  }

  onFinished() {
    console.log('in home.ts=>onFinished');
    this.ringTimerAction = "stopped";
    this.micStatus = 'stopped';
    this.startMicTimerBtnDisabled = false;
    this.pauseMicTimerBtnDisabled = true;
    this.stopMicTimerBtnDisabled = true;
    this.disableControlBtns(false);
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
    // TODO allow the counter to show 1000ms or less (goes down to a single ring)
    this.countdownFor = Math.max(this.countdownFor, 2000);
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
