import { Component, EventEmitter, OnChanges, SimpleChange, Input, Output} from '@angular/core';

import { RingTimerEngine } from './ring-timer-engine';
import { RingTimerGraphics } from './ring-timer-graphics';

@Component({
    selector: 'ring-timer',
    templateUrl: 'ring-timer.component.html'
})
export class RingTimerComponent implements OnChanges {
  @Input() timerAction: any;
  @Input() warmUpFor: any;
  @Input() countdownFor: any;
  @Input() warningFor: any;
  
  @Output() finished = new EventEmitter<boolean>();

  changeLog: string[] = [];
  config: any;
  ringTimerEngine: RingTimerEngine;
  ringTimerGraphics: RingTimerGraphics;

  constructor() {
    this.ringTimerEngine = new RingTimerEngine();
    this.ringTimerGraphics = new RingTimerGraphics(this.ringTimerEngine);
    this.ringTimerEngine.finishedSubject.subscribe( data => { this.onTimerFinished(); }); 
    this.loadDefaultConfig();
  }
  
  loadDefaultConfig() {
    let config = {
      countdownFor: 15000,  // countdown time in ms
      warmUpFor: 3000,  // countdown time in ms
      warningFor: 1000,  // countdown time in ms
    };
    this.config = config;
  }

  ngAfterViewInit(){
    this.loadParentConfig();
    this.ringTimerEngine.initTimer();
  };

  // **
  // ** Respond to messages from parent
  // **
  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    let log: string[] = [];
    for (let propName in changes) {
      let changedProp = changes[propName];
      let to = JSON.stringify(changedProp.currentValue);
      if (changedProp.isFirstChange()) {
        log.push(`Initial value of ${propName} set to ${to}`);
        this.handlePropName(propName, changedProp.currentValue, changedProp.isFirstChange());
      } else {
        let from = JSON.stringify(changedProp.previousValue);
        log.push(`${propName} changed from ${from} to ${to}`);
        this.handlePropName(propName, changedProp.currentValue, changedProp.isFirstChange());
      }
    }
    this.changeLog.push(log.join(', '));
    // console.log(JSON.stringify(this.changeLog));
  }

  handlePropName(propName, propValue, isFirstChange: boolean){
    switch (propName) {
      case 'timerAction':
        this.handleTimerAction();
        break;
      case 'warmUpFor':
      case 'countdownFor':
      case 'warningFor':
        this.config[propName] = parseInt(propValue);
        if (!isFirstChange){
          this.loadParentConfig();
          this.ringTimerEngine.initTimer();
        }
        break;
    }
  }

  handleTimerAction() {
    console.log('in handleTimerAction');
    switch (this.timerAction) {
      case ("start"):
        this.ringTimerEngine.startTimer();
        break;
      case ("pause"):
        this.ringTimerEngine.pauseTimer();
        break;
      case ("unPause"):
        this.ringTimerEngine.unPauseTimer();
        break;
      case ("stop"):
        this.ringTimerEngine.stopTimer();
        break;
      case ("stopped"):
        // do nothing - just a bounce back from notifying the parent that timer has finished.
        break;
      case ("init"):
        // do nothing - just the TimerAction being set for the first time.
        console.log('in init case');
        break;
    }
  }

  private onTimerFinished(){
    // send a message back to the parent
    console.log("about to emit 'finished' to parent");
    this.finished.emit();
  }

  // **
  // ** Load Timer's Time Settings
  // **
  loadParentConfig(){
    console.log('in loadParentConfig');
    this.config.warmUpFor = parseInt(this.warmUpFor);
    this.config.countdownFor = parseInt(this.countdownFor);
    this.config.warningFor = parseInt(this.warningFor);

    this.ringTimerEngine.setWarmUpFor(parseInt(this.warmUpFor));
    this.ringTimerEngine.setCountdownFor(parseInt(this.countdownFor));
    this.ringTimerEngine.setWarningFor(parseInt(this.warningFor));
  }
}


