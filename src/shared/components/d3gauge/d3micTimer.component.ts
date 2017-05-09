import { Component, EventEmitter, OnChanges, SimpleChange, Input, Output} from '@angular/core';

import { D3micTimerEngine } from './d3micTimerEngine';
import { D3micTimerGraphics } from './d3micTimerGraphics';


@Component({
    selector: 'd3-micTimer',
    templateUrl: 'd3micTimer.component.html'
})
export class D3MicTimerComponent implements OnChanges {
  @Input() timerAction: any;
  @Input() warmUpFor: any;
  @Input() countdownFor: any;
  @Input() warningFor: any;
  
  @Output() finished = new EventEmitter<boolean>();

  changeLog: string[] = [];
  config: any;
  d3micTimerEngine: D3micTimerEngine;
  d3micTimerGraphics: D3micTimerGraphics;

  constructor() {
    this.d3micTimerEngine = new D3micTimerEngine();
    this.d3micTimerGraphics = new D3micTimerGraphics(this.d3micTimerEngine);
    this.d3micTimerEngine.finishedSubject.subscribe( data => { this.onTimerFinished(); }); 
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
    this.d3micTimerEngine.initTimer();
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
          this.d3micTimerEngine.initTimer();
        }
        break;
    }
  }

  handleTimerAction() {
    console.log('in handleTimerAction');
    switch (this.timerAction) {
      case ("start"):
        this.d3micTimerEngine.startTimer();
        break;
      case ("pause"):
        this.d3micTimerEngine.pauseTimer();
        break;
      case ("unPause"):
        this.d3micTimerEngine.unPauseTimer();
        break;
      case ("stop"):
        this.d3micTimerEngine.stopTimer();
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

    this.d3micTimerEngine.setWarmUpFor(parseInt(this.warmUpFor));
    this.d3micTimerEngine.setCountdownFor(parseInt(this.countdownFor));
    this.d3micTimerEngine.setWarningFor(parseInt(this.warningFor));
  }
}


