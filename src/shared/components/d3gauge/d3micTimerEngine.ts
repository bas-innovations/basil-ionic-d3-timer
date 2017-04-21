import { Subject } from 'rxjs/Subject';

import * as d3 from 'd3';
import * as moment from 'moment';
import mergeDeep from '../../merge'

import { IMicTimerConfig, RingerTimeData } from './d3micTimerConfig.interface';

export class D3micTimerEngine {

  public timeDataSubject: Subject<any>;
  public phaseSubject: Subject<any>;
  public initSubject: Subject<any>;
  public pausePingSubject: Subject<any>;
  public finishedSubject: Subject<any>;
  
  private warmUpFor: number;
  private countdownFor: number;
  private warningFor: number;
  private countdownToTime: number;
  private countdownRemaining: number;
  private warmUpRemaining: number;
  
  private myD3Timer: any;
  private config: any;

  protected timeData: RingerTimeData[];

  initRingerTimeData() {
    this.timeData = [
      {idx: 0, t: 'MICROSEC', s: 10, max: 100, value: 0, endAngle: 0, baseZeroToOne: 0, singleDecValue: 0},
      {idx: 1, t: 'SECONDS', s: 1000,  max: 60, value: 0, endAngle: 0, baseZeroToOne: 0, singleDecValue: 0},
      {idx: 2, t: 'MINUTES', s: 60000, max: 60, value: 0, endAngle: 0, baseZeroToOne: 0, singleDecValue: 0},
      {idx: 3, t: 'HOURS', s: 3600000, max: 24, value: 0, endAngle: 0, baseZeroToOne: 0, singleDecValue: 0},
      {idx: 4, t: 'DAYS', s: 86400000, max: 365, value: 0, endAngle: 0, baseZeroToOne: 0, singleDecValue: 0}
    ]
  }

  loadDefaultConfig() {
    let config = {
      updateInterval: 21, // ms time between updates to text and micTimer arcs.
      timeUnitCount: 5, // number of micTimers in the component
      countdownFor: 15000,  // countdown time in ms
      warmUpFor: 3000,  // countdown time in ms
      warningFor: 1000,  // countdown time in ms
      
      calc: { // these variables are placed here as the config structure is a convenient place to store, pass them. But not actually configuration variables.
          phase: 'ready', // 'warmup', 'countdown', 'warning', 'finished', 'paused', 'stopped'
          previousPhase: 'ready', // 'warmup', 'countdown', 'warning', 'finished', 'paused', 'stopped'
          warmUpMessage: 'ready...'
      } 
    };
    this.config = config;
  }

  constructor() {
    this.initSubjects();
    this.loadDefaultConfig();
  }

  private initSubjects(){
    this.timeDataSubject = new Subject<any>();
    this.phaseSubject = new Subject<any>();
    this.initSubject = new Subject<any>();
    this.pausePingSubject = new Subject<any>();
    this.finishedSubject = new Subject<any>();
  }

  // ** 
  // ** public getters for Observers to pull data
  // **
  public getTimeData(){
    return this.timeData;
  }
  
  public getPhase(): string {
    return this.config.calc.phase;
  }

  public getTimeUnitCount(): number {
    return this.config.timeUnitCount;
  }

  public getWarmUpRemaining(): number {
    return this.warmUpRemaining;
  }

  // ** 
  // ** public setter for component
  // **
  public setWarmUpFor(warmUpFor: number){
    this.warmUpFor = warmUpFor;
  }  
  public setCountdownFor(countdownFor: number){
    this.countdownFor = countdownFor;
  }  
  public setWarningFor(warningFor: number){
    this.warningFor = warningFor;
  }  

  // **
  // ** Load Timer's Time Settings
  // **
  loadParentConfig(){
    this.config.warmUpFor = this.warmUpFor;
    this.config.countdownFor = this.countdownFor;
    this.config.warningFor = this.warningFor;
  }

  // **
  // ** Timer functions
  // **
  readyTimer() {
    // load configuration data
    this.loadDefaultConfig();
    this.loadParentConfig();
    // load fresh Time Data object
    this.initRingerTimeData();
    // calculate the time to run the timer
    this.setCountdownToTime();
    // setup the number of time units to process.
    this.config.timeUnitCount = this.getInitialTimeUnitCount();
    this.setNumTimeUnits();
    
    this.setPhaseByValue('ready');
    let time = this.setTimeRemainingAndPhase();
    this.updateTimeData(time);
  }

  public initTimer(){
    console.log('in initTimer');
    this.readyTimer();
    this.initChanged();
  }

  public startTimer(): void {
    if (this.config.calc.phase !== 'ready')
        return;
    // move from ready to warmup;
    this.setPhaseByValue('warmup');
    this.setCountdownToTime();
    // start the timer loop
    this.runTimer();
  }

  runTimer() {
    let self = this;
    this.myD3Timer = d3.interval(function(elapsed) {
      // check if time is up or if it has been stopped by the user.
      if ((self.config.calc.phase === 'finished') || (self.config.calc.phase === 'stopped')) {
        if (self.config.calc.phase === 'finished') console.log('timer has finished');
        if (self.config.calc.phase === 'stopped') console.log('timer has been stopped');
        self.myD3Timer.stop();
        self.update();
        self.resetTimer();
      } else {
        self.update();
      };
    }, this.config.updateInterval)
  }

  public pauseTimer(){
    this.config.calc.previousPhase = this.config.calc.phase;
    this.myD3Timer.stop();
    this.setPhaseByValue('paused');
    this.runTimer();
  }

  public unPauseTimer() {
    this.myD3Timer.stop();
    this.setPhaseByValue(this.config.calc.previousPhase);
    this.countdownToTime = new Date().getTime() + this.countdownRemaining;
    this.runTimer();
  }

  public stopTimer() {
    this.myD3Timer.stop();
    this.setPhaseByValue('stopped');
    this.runTimer();
  }

  resetTimer(){
    this.readyTimer();
    this.finishedChanged();
  };

  setCountdownToTime(){
    let currentTime = new Date().getTime()
    this.countdownToTime = currentTime + this.config.countdownFor + this.config.warmUpFor;
    console.log('setCountdownToTime=>currentTime: ' + currentTime);
    console.log('setCountdownToTime=>this.config.countdownFor: ' + this.config.countdownFor);
    console.log('setCountdownToTime=>this.config.warmUpFor: ' + this.config.warmUpFor);
    console.log('setCountdownToTime=>this.countdownToTime: ' + this.countdownToTime);
  }

  // **
  // ** update is called by the main timer interval, it simply calls the methods required to
  // ** update the time information and redraw the timer components d3 objects.
  // **
  update(): any {
    let time = this.setTimeRemainingAndPhase();
    
    if (!this.isTimerPaused())
      this.updateTimeData(time);
    else {
      this.pausePing();
    }
  }

  setTimeRemainingAndPhase(): number {
    let time: number = 0;

    // store the new time remaining and exit
    // check that we aren't already paused, stopped or finished.
    switch(this.config.calc.phase) {
      case 'ready':
        this.countdownRemaining = this.config.countdownFor + this.config.warmUpFor;
        time = this.config.countdownFor;
        break;
      case 'warmup':
      case 'countdown':
      case 'warning':
        time = Math.max(0, this.countdownToTime - (new Date().getTime()));
        this.countdownRemaining = time;
        this.setPhase(this.countdownRemaining);
        if (this.config.calc.phase === 'warmup') { 
          // initially the countdown time was displayed during warmup - it has now been replaced by text.
          time = Math.min(time, this.config.countdownFor);
          // over the period of a second, during the warm up phase, we want the alpha component of the countdown rings and text to rise from 0 to 1.
          this.warmUpRemaining = Math.max(0, this.countdownRemaining - this.config.countdownFor);
        };
        break;
      case 'paused':
        break;
      case 'finished':
      case 'stopped':
        time = 0;
        this.countdownRemaining = 0;
        break;
      default :
        // typically would throw error here rather than console.log
        console.log('error we have an unrecognised timer status')
    }
    return time;
  }

  updateTimeData(time: number){
    let timeInMS = time;

    for (let i=this.timeData.length-1; i>=0; i--) {
      let td = this.timeData[i];
      let value: number = time / td.s;
      td.singleDecValue = timeInMS  / td.s;
      time -= Math.floor(value) * td.s;
      td.value = Math.floor(value);
      // calculate arc end angle
      let degrees = Math.max(0, 360 - (td.value / td.max) * 360.0);  // prevent the degrees going negative with slight timer overrun.
      td.endAngle = degrees * (Math.PI / 180);
      td.baseZeroToOne = (td.value / td.max);

      if (this.config.calc.phase === 'finished' || this.config.calc.phase === 'stopped') {
        degrees = 0; //360;
        td.endAngle = 0; // 2 * Math.PI;
        td.singleDecValue = 0;
        td.baseZeroToOne = 0;
      }
    }
    this.timeDataChanged();
  }

  // Notify Observers of change
  timeDataChanged(){
    if (this.timeDataSubject !== undefined)
      this.timeDataSubject.next(true);
  }

  pausePing(){
    if (this.pausePingSubject !== undefined)
      this.pausePingSubject.next(true);
  }

  phaseChanged(){
    if (this.phaseSubject !== undefined)
      this.phaseSubject.next(true);
  }

  initChanged(){
    if (this.initSubject !== undefined)
      this.initSubject.next(true);
  }

  finishedChanged(){
    if (this.finishedSubject !== undefined)
      this.finishedSubject.next(true);
  }

  // Pull a phase change into the queue
  setPhaseByValue(phase){
    let t = d3.timer(() => {
      this.config.calc.phase = phase;
      this.phaseChanged();
      //console.log('phase set by value to :' + phase);
      t.stop();
    }, 0);
  };

  // Set the phase based on the timer's time.
  setPhase(timeRemaining){
    // this should only be calls when the timer is actively running (i.e. phase warmup, countdown and warning)
    // console.log(timeRemaining);
    if (this.config.calc.phase === 'warmup' || this.config.calc.phase === 'countdown' || this.config.calc.phase === 'warning') {
      if (timeRemaining > this.config.countdownFor) {
        this.setPhaseByValue('warmup');
      } else if ((timeRemaining <= this.config.countdownFor) && (timeRemaining > this.config.warningFor)) {
        this.setPhaseByValue('countdown');
      } else if ((timeRemaining <= this.config.warningFor) && (timeRemaining > this.config.updateInterval)) {
        this.setPhaseByValue('warning');
      } else if (timeRemaining <= this.config.updateInterval){
        // less than an interval to go - let's finish up.
        this.setPhaseByValue('finished');
      } else {
        // typically would throw error here rather than console.log
        console.log('Error in d3micTimer.component.ts=>setPhase')
      }
    }
  }

  isTimerPaused(): boolean {
    return (this.config.calc.phase === 'paused');
  }

  // **
  // ** Determine number of Time Units to be processed
  // **
  getInitialTimeUnitCount(): number{
    let time: number = Math.abs(this.countdownToTime - (new Date().getTime()) - +this.config.warmUpFor);
    console.log('in getInitialRingNums=>this.countdownToTime: ' + this.countdownToTime);
    console.log('in getInitialRingNums=>time: ' + time);
    console.log('in getInitialRingNums=>getTime: ' + new Date().getTime());
    for (let timeUnitCount=this.timeData.length-1; timeUnitCount>=0; timeUnitCount--) {
      let td = this.timeData[timeUnitCount];
      if (time > td.s) return (timeUnitCount + 1);
    }
    return 1;
  }

  setNumTimeUnits() {
    // remove unneeded rows from the timeData array.
    let arrSize = this.timeData.length;
    for (let i=arrSize-1; i>=this.config.timeUnitCount; i--) {
      this.timeData.pop();
    }
  }

}