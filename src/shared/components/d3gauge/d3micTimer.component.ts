import { Component, EventEmitter, OnInit, OnChanges, SimpleChange, OnDestroy, Input, Output} from '@angular/core';

import * as d3 from 'd3';
import * as moment from 'moment';
import mergeDeep from '../../merge'
import { IMicTimerConfig } from './d3micTimerConfig.interface';


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

  countdownToTime: number;
  countdownRemaining: number;
  warmupRemaining: number;
  micTimer: any;
  micTimerAttr: any;
  micTimerGroup: any;
  myD3Timer: any;

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

  config: any;

  loadDefaultConfig() {
    let config = {
      rCount: 5, // number of micTimers in the component
      ringSpacing: 2, // px spacing between the s and ms counter rings
      rSize: 30, // px overall size of internal micTimer ex the arc thickness
      rThickness: 10, // px thickness of micTimer
      msShrinkFactor: 0.75, // microsecond circle thickness. 0 is full size, 1 is zero thickness
      scaleFactor: 0.75,  // multiplier to scale the entire gauge.
      updateInterval: 20, // ms time between updates to text and micTimer arcs.
      firstCircleColor: 'rgba' + d3.rgb("lightslategrey").toString().slice(3, - 1) +  ', 0.2)', // lightslategrey
      readyCircleColor: 'rgba' + d3.rgb("gold").toString().slice(3, - 1) +  ', 0.7)', //gold
      countdownCircleColor: 'rgba' + d3.rgb("seagreen").toString().slice(3, - 1) +  ', 0.7)', // seagreen
      warmupCircleColor: "orange", // orange
      warmupFlashTime: 1000, // time to change alpha of warmup band.
      warningCircleColor: 'rgba' + d3.rgb("red").toString().slice(3, - 1) +  ', 0.8)', // red
      finishedCircleColor: 'rgba' + d3.rgb("outer space").toString().slice(3, - 1) +  ', 0.8)', // outer space
      textColor: "black",
      counterTextSize: 1.5, // The relative height of the text to display in the circle. 1 = 50%
      unitTextSize: 0.6, // The relative height of the text to display in the circle. 1 = 50%
      countdownTo: "31/03/2017",
      countdownFor: 15000,  // countdown time in ms
      warmUpFor: 3000,  // countdown time in ms
      warningFor: 1000,  // countdown time in ms
      elementId: 'micTimer-gauge',
      calc: {
          radius: 0,
          counterTextPixels: 0,
          unitTextPixels: 0,
          phase: 'ready',
          previousPhase: 'ready',
          pauseAlpha: 1.0,
          warmUpAlpha: 1.0,
          warmUpMessage: 'ready...'
      } // 'warmup', 'countdown', 'warning', 'finished', 'paused', 'stopped'.
    };
    this.config = config;
  }

  constructor() {
    this.loadDefaultConfig();
  }
  
  ngAfterViewInit(){
    this.initTimer();
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

    console.log(JSON.stringify(this.changeLog));
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
          this.initTimer();
        }
        break;
    }
  }

  loadParentConfig(){
    this.config.warmUpFor = parseInt(this.warmUpFor);
    this.config.countdownFor = parseInt(this.countdownFor);
    this.config.warningFor = parseInt(this.warningFor);
  }

  handleTimerAction() {
    console.log('in handleTimerAction');
    switch (this.timerAction) {
      case ("start"):
        console.log('in handleTimerAction: this.config.calc.phase: ' + this.config.calc.phase);
        if (this.config.calc.phase === 'ready') this.startTimer();
        break;
      case ("pause"):
        console.log('received pause message');
        this.pauseTimer();
        break;
      case ("unPause"):
        console.log('received unpause message');
        this.unPauseTimer();
        break;
      case ("stop"):
        console.log('received stop message');
        this.stopTimer();
        break;
      case ("stopped"):
        // do nothing - just a bounce back from notifying the parent that timer has finished.
        console.log('received stopped message');
        break;
      case ("init"):
        // do nothing - just the TimerAction being set for the first time.
        break;
    }
  }

  // **
  // ** Timer functions
  // **

  initTimer(){
    this.readyTimer();
    this.initD3Timer();
    this.updateTimeData();
    this.drawD3Timer();
  }

  readyTimer() {
    this.loadDefaultConfig();
    this.loadParentConfig();

    this.initRingerTimeData();
    this.setCountdownToFromTime();
    this.applySizeScaleFactor();

    // setup the number of rings to display.
    let numRings = this.getInitialRingNums();
    this.setNumRings(numRings);
    this.initDimensions();
    console.log('about to set phase to ready');
    this.setPhaseByValue('ready');
  }

  startTimer() {
    // move from ready to warmup;
    this.setPhaseByValue('warmup');
    this.setCountdownToFromTime();
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

  pauseTimer(){
    this.config.calc.previousPhase = this.config.calc.phase;
    this.myD3Timer.stop();
    this.setPhaseByValue('paused');
    this.runTimer();
  }

  unPauseTimer() {
    this.myD3Timer.stop();
    this.setPhaseByValue(this.config.calc.previousPhase);
    this.countdownToTime = new Date().getTime() + this.countdownRemaining;
    this.runTimer();
  }

  stopTimer() {
    this.myD3Timer.stop();
    this.setPhaseByValue('stopped');
    this.runTimer();
  }

  resetTimer(){
    console.log('in resetTimer')
    this.readyTimer();
    this.updateTimeData();
    this.drawD3Timer();
    // send a message back to the parent
    console.log("about to emit 'finished' to parent");
    this.finished.emit();
  };

  setCountdownToFromTime(){
    let currentTime = new Date().getTime()
    this.countdownToTime = currentTime + this.config.countdownFor + this.config.warmUpFor;
    console.log('setCountdownToFromTime=>currentTime: ' + currentTime);
    console.log('setCountdownToFromTime=>this.config.countdownFor: ' + this.config.countdownFor);
    console.log('setCountdownToFromTime=>this.config.warmUpFor: ' + this.config.warmUpFor);
    console.log('setCountdownToFromTime=>this.countdownToTime: ' + this.countdownToTime);
  }

  update(): any {
    this.updateTimeData();
    this.drawD3Timer();
  }

  updateTimeData(){
    let time: number = 0;

    // store the new time remaining and exit
    // check that we aren't already paused, stopped or finished.
    switch(this.config.calc.phase) {
      case 'ready':
        this.countdownRemaining = this.config.countdownFor + this.config.warmUpFor;
        time = this.config.countdownFor;
        //console.log('ready: countdownRemaining: ' + this.countdownRemaining);
        //console.log('ready: time: ' + time);
        break;
      case 'warmup':
        // the timer doesn't start until we enter the countdown phase.
        // during warmup, the colors and number displayed stay at the position expected
        // at the beginning of the countdown.
      case 'countdown':
      case 'warning':
        time = Math.max(0, this.countdownToTime - (new Date().getTime()));
        this.countdownRemaining = time;
        this.setPhase(this.countdownRemaining);
        if (this.config.calc.phase === 'warmup') { 
          // initially the countdown time was displayed during warmup - it has now been replaced by text.
          time = Math.min(time, this.config.countdownFor);
          // over the period of a second we want the alpha component of the warmUp ring to rise to 1 and fall to zero.
          this.warmupRemaining = Math.max(0, this.countdownRemaining - this.config.countdownFor);
          this.config.calc.warmUpAlpha = ((this.warmupRemaining)/this.config.warmupFlashTime) % 1;
          // the warmUp text - giving user plenty of notice timer will start shortly.
          if (this.warmupRemaining >= 2000) this.config.calc.warmupMessage = '..-' + Math.ceil((this.warmupRemaining/1000)) + '..';
          if (this.warmupRemaining < 2000) this.config.calc.warmupMessage = "ready..";
          if (this.warmupRemaining < 1000) this.config.calc.warmupMessage = "set..";
          if (this.warmupRemaining < 100) this.config.calc.warmupMessage = "go..";
        };
        break;
      case 'finished':
        time = 0;
        this.countdownRemaining = 0;
        break;
      case 'paused':
        this.config.calc.pauseAlpha = (new Date().getTime()/this.config.warmupFlashTime) % 1;
        this.config.calc.pauseAlpha = (this.config.calc.pauseAlpha > 0.5) ? 1 - this.config.calc.pauseAlpha : this.config.calc.pauseAlpha;
        return;
      case 'stopped':
        time = 0;
        this.countdownRemaining = 0;
        break;
      default :
        console.log('error we have an unrecognised timer status')
    }

    let timeInMS = time;
    this.config.calc.previousPhase = this.config.calc.phase;

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
  }

  // Pull a phase change into the queue
  setPhaseByValue(phase){
    let t = d3.timer(() => {
      this.config.calc.phase = phase;
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
        console.log('Error in d3micTimer.component.ts=>setPhase')
      }
    }
  }

  // **
  // ** Component UI dimensions routines
  // **
  applySizeScaleFactor(){
    console.log('in applySizeScaleFactor')
    this.config.ringSpacing = this.config.ringSpacing * this.config.scaleFactor;
    this.config.rSize = this.config.rSize * this.config.scaleFactor;
    this.config.rThickness = this.config.rThickness * this.config.scaleFactor;
  }

  getInitialRingNums(): number{
    let time: number = Math.abs(this.countdownToTime - (new Date().getTime()) - +this.config.warmUpFor);
    console.log('in getInitialRingNums=>this.countdownToTime: ' + this.countdownToTime);
    console.log('in getInitialRingNums=>time: ' + time);
    console.log('in getInitialRingNums=>getTime: ' + new Date().getTime());
    for (let i=this.timeData.length-1; i>=0; i--) {
      let td = this.timeData[i];
      if (time > td.s) return (i + 1);
    }
    return 1;
  }

  setNumRings(numRings) {
    this.config.rCount = numRings;
    let arrSize = this.timeData.length;
    for (let i=arrSize-1; i>=numRings; i--) {
      this.timeData.pop();
    }
  }

  initDimensions(){
    this.micTimerAttr = {
      w: (this.config.rSize  + (this.config.rThickness * this.config.rCount) + ((this.config.rCount - 1) * this.config.ringSpacing)) * 2 + 6, // the +4 accounts for svg border.
      h: (this.config.rSize + (this.config.rThickness * this.config.rCount) + ((this.config.rCount - 1) * this.config.ringSpacing)) * 2 + 6,
      margin: {top: 2, bottom: 2, right: 2, left: 2}
    };

    // Outer Radius of Ringer Gauge
    this.config.calc.radius = this.micTimerAttr.w / 2;

    // Calculate the size of the font in pixels
    this.config.calc.counterTextPixels = (this.config.counterTextSize * this.config.rSize / 2);
    this.config.calc.unitTextPixels = (this.config.unitTextSize * this.config.rSize / 2);
  }

  // **
  // ** D3 UI routines
  // **

  // ** Initialise D3 objects
  initD3Timer() {
    this.micTimer = d3.select("#" + this.config.elementId)
        .style("width", this.micTimerAttr.w + this.micTimerAttr.margin.left + this.micTimerAttr.margin.right)   // adjust the svg size to fit all the individual counters
        .style("height", this.micTimerAttr.h + this.micTimerAttr.margin.top + this.micTimerAttr.margin.bottom); // adjust the svg size to fit all the individual counters

    this.micTimer.selectAll("*").remove();
    this.micTimerGroup = this.micTimer.append("g")
        .attr("transform", "translate(" + this.micTimerAttr.margin.left + "," + this.micTimerAttr.margin.top + ")");

    // filter stuff
    /* For the drop shadow filter... */
    let defs = this.micTimerGroup.append( 'defs' );

    let filter = defs.append( 'filter' )
                      .attr( 'id', 'dropshadow' )

    filter.append( 'feGaussianBlur' )
          .attr( 'in', 'SourceAlpha' )
          .attr( 'stdDeviation', 2 ) // 2
          .attr( 'result', 'blur' );
    filter.append( 'feOffset' )
          .attr( 'in', 'blur' )
          .attr( 'dx', 1 ) // 2
          .attr( 'dy', 1 ) // 3
          .attr( 'result', 'offsetBlur' );

    let feMerge = filter.append( 'feMerge' );

    feMerge.append( 'feMergeNode' )
            .attr( 'in", "offsetBlur' )
    feMerge.append( 'feMergeNode' )
            .attr( 'in', 'SourceGraphic' );
    // end filter stuff

    // gradient stuff
    let gradientBackgroundRed = defs.append( 'linearGradient' )
                                    .attr( 'id', 'gradientBackgroundRed' )
                                    .attr( 'x1', '0' )
                                    .attr( 'x2', '0' )
                                    .attr( 'y1', '0' )
                                    .attr( 'y2', '1' );
    gradientBackgroundRed.append( 'stop' )
                        .attr( 'class', 'redBackgroundStop1' )
                        .attr( 'offset', '0%' );

    gradientBackgroundRed.append( 'stop' )
                        .attr( 'class', 'redBackgroundStop2' )
                        .attr( 'offset', '100%' );

    let gradientForegroundRed = defs.append( 'linearGradient' )
                                    .attr( 'id', 'gradientForegroundRed' )
                                    .attr( 'x1', '0' )
                                    .attr( 'x2', '0' )
                                    .attr( 'y1', '0' )
                                    .attr( 'y2', '1' );
    gradientForegroundRed.append( 'stop' )
                        .attr( 'class', 'redForegroundStop1' )
                        .attr( 'offset', '0%' );

    gradientForegroundRed.append( 'stop' )
                        .attr( 'class', 'redForegroundStop2' )
                        .attr( 'offset', '100%' );

    // end gradient stuff

  }

  // ** Draw and redraw D3 objects
  drawD3Timer() {

    let config = this.config;
    let radius = config.calc.radius;

    // Scales for drawing the outer circle.
    let gaugeCircleX = d3.scaleLinear().range([0, 2 * Math.PI]).domain([0, 1]);
    let gaugeCircleY = d3.scaleLinear().range([0, radius]).domain([0, radius]);

    // set range min to 0.3 as don't want text, arc to be fully transparent.
    // domain oscillates between 0 and 1.0
    let warmupScale = d3.scalePow().exponent(0.8).range([0.3, 1]).domain([0, 1]);

    // **
    // ** Draw the base circles (first circles).
    // **
   let self = this;
    let firstCircleArc = d3.arc()
      .startAngle(gaugeCircleX(0))
      .endAngle(gaugeCircleX(1))
      .innerRadius(< any > function(d) {
            if (d.idx === 0) {
              return gaugeCircleY((self.config.rSize + self.config.rThickness * self.config.msShrinkFactor),);
            } else {
              return gaugeCircleY((self.config.rSize + (self.config.rThickness * d.idx) + (d.idx * self.config.ringSpacing)),);
            };
          })
      .outerRadius(< any > function(d) {
            return gaugeCircleY((self.config.rSize + (self.config.rThickness * (d.idx + 1)) + (d.idx * self.config.ringSpacing)),);
          });

    let fc = this.micTimerGroup.selectAll(".firstCircle")
        .data(this.timeData, < any > function(d, i) { return d.idx; });

    fc.enter()
      .append("path")
        .attr("class", "firstCircle")
        .attr("d", firstCircleArc)
        .attr( 'filter', 'url(#dropshadow)' )
        .attr("transform", "translate(" + radius + "," + radius + ")" )
        .style("fill", config.firstCircleColor)
      .merge(fc);

    fc.exit().remove();

    // **
    // ** Draw the timer circles (second circles).
    // **
    let secondCircleArc = d3.arc()
      .startAngle(gaugeCircleX(0))
      .endAngle(< any > function(d) {
            return gaugeCircleX(d.baseZeroToOne);
          })
      .innerRadius(< any > function(d) {
            if (d.idx === 0) {
              return gaugeCircleY((self.config.rSize + self.config.rThickness * self.config.msShrinkFactor),);
            } else {
              return gaugeCircleY((self.config.rSize + (self.config.rThickness * d.idx) + (d.idx * self.config.ringSpacing)),);
            };
          })
      .outerRadius(< any > function(d) {
            return gaugeCircleY((self.config.rSize + (self.config.rThickness * (d.idx + 1)) + (d.idx * self.config.ringSpacing)),);
          });

    let sc = this.micTimerGroup.selectAll(".secondCircle")
      .data(this.timeData, < any > function(d, i) { return d.idx; });

    sc.enter()
      .append("path")
        .attr("class", "secondCircle")
        .attr("transform", "translate(" + radius + "," + radius + ")" )
      .merge(sc)
        .style("fill", < any > function(d, i) {
            switch (config.calc.phase) {
              case 'ready': return config.readyCircleColor;
              case 'warmup': { 
                  let warmupColor = d3.rgb(config.warmupCircleColor);
                  warmupColor.opacity = warmupScale(config.calc.warmUpAlpha);
                  return warmupColor;
              };
              case 'paused': { 
                  let pauseColor = d3.rgb(config.readyCircleColor);
                  pauseColor.opacity = warmupScale(config.calc.pauseAlpha);
                  return pauseColor;
              };
              case 'countdown': return config.countdownCircleColor;
              case 'warning': return config.warningCircleColor;
              case 'finished': return config.finishedCircleColor;
            }
        })
       .attr("d", secondCircleArc);

    sc.exit().remove();

    // ** 
    // ** Counter
    // **
    let unitsToDisplay = 'SECONDS';
    let singleDecValueIdx: number = 0;
    for (let td of this.timeData) {
      if (td.t === unitsToDisplay) {
        break;
      }
      singleDecValueIdx++;
    };

    let textShift = config.calc.counterTextPixels * 0.15;
    let textShiftLabel = config.calc.counterTextPixels * 0.25;

    let ct = this.micTimerGroup.selectAll(".counterText")
      .data([this.timeData[singleDecValueIdx]]);

    ct.enter()
      .append("text")
        .attr("class", "counterText")
        .attr("text-anchor", "middle")
        .attr("font-size", config.calc.counterTextPixels + "px")
        .attr("transform", "translate(" + radius + "," + (radius + textShift) + ")" )
      .merge(ct)
        .style("fill", < any > function(d, i) {
          if (config.calc.phase === 'warmup') { 
            let warmupTextColor = d3.rgb(config.textColor);
            warmupTextColor.opacity = warmupScale(config.calc.warmUpAlpha);
            //console.log(config.calc.warmUpAlpha);
            //console.log(warmupColor.toString());
            return warmupTextColor;
          } else if (config.calc.phase === 'paused') { 
            let pauseColor = d3.rgb(config.textColor);
            pauseColor.opacity = warmupScale(config.calc.pauseAlpha);
            return pauseColor;
          } else {
            return config.textColor;
          }
        })
        .text(< any > function(d) {
          if (config.calc.phase === 'warmup') { 
            return config.calc.warmupMessage;
          } else {
            let retVal = (d.singleDecValue.toFixed(2) < 1.0) ? d.singleDecValue.toFixed(2) : d.singleDecValue.toFixed(1);
            return retVal;
          }
        });

    ct.exit().remove();

    // ** 
    // ** Label
    // **
    let lt = this.micTimerGroup.selectAll(".labelText")
      .data([this.timeData[singleDecValueIdx]]);

    lt.enter()
      .append("text")
        .text(< any > function(d) {
            return d.t;
          })
        .attr("class", "labelText")
        .attr("text-anchor", "middle")
        .attr("font-size", config.calc.unitTextPixels + "px")
        .style("fill", config.textColor)
        .attr("transform", "translate(" + radius + "," + (radius + config.calc.unitTextPixels + textShiftLabel) + ")" );

    lt.exit().remove();
  }
}

export interface RingerTimeData {
  idx: number;
  t: string;
  s: number;
  max: number;
  value: number;
  endAngle: number;
  baseZeroToOne: number;
  singleDecValue: number;
}

