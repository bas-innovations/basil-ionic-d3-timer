import { Component } from '@angular/core';

import * as d3 from 'd3';

import { D3micTimerEngine } from './d3micTimerEngine';
import { RingerTimeData } from './d3micTimerConfig.interface';

export class D3micTimerGraphics {

  d3MicTimerEngine: D3micTimerEngine;
  micTimer: any;
  micTimerGroup: any;
  micTimerAttr: any;
  config: any;
  isTimerInitialised: boolean = false;

  // d3 scales
  gaugeCircleX: any;
  gaugeCircleY: any;
  warmUpScale: any;

  // reference to timeData object
  timeData: any;
  warmUpRemaining: number;

  private loadDefaultConfig(): void {

    let config = {
      // layout/colours configuration
      ringSpacing: 2, // px spacing between the s and ms counter rings
      rSize: 30, // px overall size of internal micTimer ex the arc thickness
      rThickness: 10, // px thickness of micTimer
      msShrinkFactor: 0.75, // microsecond circle thickness. 0 is full size, 1 is zero thickness
      scaleFactor: 1.00,  // multiplier to scale the entire gauge.
      counterTextSize: 1.5, // The relative height of the text to display in the circle. 1 = 50%
      unitTextSize: 0.6, // The relative height of the text to display in the circle. 1 = 50%

      colors: {
        first: 'rgba' + d3.rgb("lightslategrey").toString().slice(3, - 1) +  ', 0.2)', // lightslategrey
        ready: 'rgba' + d3.rgb("gold").toString().slice(3, - 1) +  ', 0.7)', //gold
        countdown: 'rgba' + d3.rgb("seagreen").toString().slice(3, - 1) +  ', 0.7)', // seagreen
        warmup: "orange", // orange
        warning: 'rgba' + d3.rgb("red").toString().slice(3, - 1) +  ', 0.7)', // red
        paused: 'rgba' + d3.rgb("gold").toString().slice(3, - 1) +  ', 0.7)', //gold
        finished: 'rgba' + d3.rgb("gold").toString().slice(3, - 1) +  ', 0.8)', // outer space
        stopped: 'rgba' + d3.rgb("outer space").toString().slice(3, - 1) +  ', 0.8)', // outer space
        text:  'rgba' + d3.rgb("black").toString().slice(3, - 1) +  ', 1.0)', // black
      },

      warmUpFlashTime: 1000, // time to change alpha of warmup band.
      unitsToDisplay: 'SECONDS',
      ringCount: 5, // number of micTimers in the component
      elementId: 'micTimer-gauge',

      calc: { // these variables are placed here as the config structure is a convenient place to store, pass them. But not actually configuration variables.
          radius: 0,
          counterTextPixels: 0,
          unitTextPixels: 0,
          // variable set via public setters
          phase: 'ready', // 'warmup', 'countdown', 'warning', 'finished', 'paused', 'stopped'
          warmUpMessage: 'ready...',
          pauseAlpha: 1.0, // variable to enable pulsing effect during a pause phase.
          warmUpAlpha: 1.0, // variable to enable pulsing effect during the warm up phase.
          
      } 
    };
    this.config = config;
  }

  constructor(d3MicTimerEngine: D3micTimerEngine){
    this.loadDefaultConfig();
    this.d3MicTimerEngine = d3MicTimerEngine;
    this.d3MicTimerEngine.timeDataSubject.subscribe( timeData => { this.updateTimeData(); });     
    this.d3MicTimerEngine.phaseSubject.subscribe( timeData => { this.updatePhase(); });
    this.d3MicTimerEngine.initSubject.subscribe( timeData => { this.updateInit(); });
    this.d3MicTimerEngine.pausePingSubject.subscribe( timeData => { this.updateTimeData(); });
  }

  private updateTimeData(): void {
    this.timeData = this.d3MicTimerEngine.getTimeData();
    if (!this.isTimerInitialised)
      return;
    if (this.isWarmUpPhase()) {
      this.determineWarmUpAlpha();
      this.determineWarmUpMessage();
    }
    if (this.isPausedPhase())
      this.determinePauseAlpha();

    this.drawD3Timer();
  }

  private updatePhase(): void{
    this.setPhase(this.d3MicTimerEngine.getPhase());
  }

  private updateInit(): void {
    console.log('in updateInit');
    this.setRingCount(this.d3MicTimerEngine.getTimeUnitCount()+1);
    this.initDimensions(); // extracted from end of readyTimer
    this.initD3Timer();
    this.drawD3Timer();    
  }

  private setPauseAlpha(pauseAlpha){
    this.config.calc.pauseAlpha = pauseAlpha;
  }

  private setWarmUpAlpha(warmUpAlpha){
    this.config.calc.warmUpAlpha = warmUpAlpha;
  }

  private setWarmupMessage(warmUpMessage){
    this.config.calc.warmUpMessage = warmUpMessage;
  }

  private setPhase(phase: string){
    this.config.calc.phase = phase;
  }

  private isWarmUpPhase(): boolean {
    return (this.config.calc.phase === "warmup");
  }

  private isPausedPhase(): boolean {
    return (this.config.calc.phase === "paused");
  }

  private setRingCount(ringCount: number){
    this.config.ringCount = ringCount;
  }

  private determineWarmUpAlpha(): void {
    this.warmUpRemaining = this.d3MicTimerEngine.getWarmUpRemaining();
    let warmUpAlpha = ((this.warmUpRemaining)/this.config.warmUpFlashTime) % 1;
    this.setWarmUpAlpha(warmUpAlpha);
  }

  // the warmUp text - gives user plenty of notice timer will start shortly.
  private determineWarmUpMessage(): void {
    let warmUpMessage: string = '';
    if (this.warmUpRemaining >= 2000) warmUpMessage = '..-' + Math.ceil((this.warmUpRemaining/1000)) + '..';
    if (this.warmUpRemaining < 2000) warmUpMessage = "ready..";
    if (this.warmUpRemaining < 1000) warmUpMessage = "set..";
    if (this.warmUpRemaining < 100) warmUpMessage = "go..";
    this.setWarmupMessage(warmUpMessage);
  }

  private determinePauseAlpha(): void {
    // over the period of a second, during a pause phase, we want the alpha component of the countdown rings and text to rise from 0 to 1.
    let pauseAlpha = (new Date().getTime()/this.config.warmUpFlashTime) % 1;
    pauseAlpha = (pauseAlpha > 0.5) ? 1 - pauseAlpha : pauseAlpha;
    this.setPauseAlpha(pauseAlpha);
  }

  // determine overall dimensions of control and its major components
  public initDimensions(): void {
    console.log('in initDimensions');
    this.applySizeScaleFactor();

    this.micTimerAttr = {
      w: (this.config.rSize  + (this.config.rThickness * this.config.ringCount) + ((this.config.ringCount - 1) * this.config.ringSpacing)) * 2 + 6, // the +6 adds some margins.
      h: (this.config.rSize + (this.config.rThickness * this.config.ringCount) + ((this.config.ringCount - 1) * this.config.ringSpacing)) * 2 + 6,
      margin: {top: 2, bottom: 2, right: 2, left: 2}
    };

    // Outer Radius of Ringer Gauge
    this.config.calc.radius = this.micTimerAttr.w / 2;

    // Calculate the size of the font in pixels
    this.config.calc.counterTextPixels = (this.config.counterTextSize * this.config.rSize / 2);
    this.config.calc.unitTextPixels = (this.config.unitTextSize * this.config.rSize / 2);
  }

  private applySizeScaleFactor(): void{
    this.config.ringSpacing = this.config.ringSpacing * this.config.scaleFactor;
    this.config.rSize = this.config.rSize * this.config.scaleFactor;
    this.config.rThickness = this.config.rThickness * this.config.scaleFactor;
  }

  // **
  // ** D3 UI routines
  // **

  // ** Initialise D3 objects
  public initD3Timer(): void {
    console.log('in initD3Timer');
    this.getTimerSVG();
    this.sizeTimerSVG();
    this.clearTimerSVG();
    this.micTimerGroup = this.micTimer.append("g")
        .attr("transform", "translate(" + this.micTimerAttr.margin.left + "," + this.micTimerAttr.margin.top + ")");
    this.addDropShadow();
    this.initD3Scales();
    this.isTimerInitialised = true;
  }
  
  private getTimerSVG(): void {
    this.micTimer = d3.select("#" + this.config.elementId);
  }
  
  private sizeTimerSVG(): void {
    this.micTimer
      // adjust the svg size to fit all the individual counters
      .style("width", this.micTimerAttr.w + this.micTimerAttr.margin.left + this.micTimerAttr.margin.right) 
      // adjust the svg size to fit all the individual counters}
      .style("height", this.micTimerAttr.h + this.micTimerAttr.margin.top + this.micTimerAttr.margin.bottom); 
  }

  private clearTimerSVG(): void {
    this.micTimer.selectAll("*").remove();
  }

  private addDropShadow(): void {

    // ** filter stuff
    // ** For the drop shadow filter...
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
  }

  initD3Scales(){
    console.log('in initD3Scales');
    
    // Scales for drawing the outer circle.
    this.gaugeCircleX = d3.scaleLinear()
                          .range([0, 2 * Math.PI]).domain([0, 1])
                        
    this.gaugeCircleY = d3.scaleLinear()
                          .range([0, this.config.calc.radius])
                          .domain([0, this.config.calc.radius]);
                        

    // set range min to 0.3 as don't want text, arc to be fully transparent.
    // domain oscillates between 0 and 1.0
    this.warmUpScale = d3.scalePow().exponent(0.8)
                          .range([0.3, 1])
                          .domain([0, 1]);
  }

  // ** Draw and redraw D3 objects
  public drawD3Timer(): void {
    this.drawFirstCircle();  // the base layer
    this.drawSecondCircle(); // the moving layer
    this.drawCounterText(); 
    this.drawTimeUnitsText();
  }

  getCounterDecValueIdx() : number {
    let singleDecValueIdx: number = 0;
    for (let td of this.timeData) {
      if (td.t === this.config.unitsToDisplay) {
        singleDecValueIdx = td.idx;
        break;
      }
    };
    return singleDecValueIdx;
  }

  // **
  // ** Draw the base circles (first circles).
  // **
  drawFirstCircle(){
    // console.log('in drawFirstCircle');
    let self = this;
    let firstCircleArc = d3.arc()
      .startAngle(this.gaugeCircleX(0))
      .endAngle(this.gaugeCircleX(1))
      .innerRadius(< any > function(d) {
            if (d.idx === 0) {
              return self.gaugeCircleY((self.config.rSize + self.config.rThickness * self.config.msShrinkFactor),);
            } else {
              return self.gaugeCircleY((self.config.rSize + (self.config.rThickness * d.idx) + (d.idx * self.config.ringSpacing)),);
            };
          })
      .outerRadius(< any > function(d) {
            return self.gaugeCircleY((self.config.rSize + (self.config.rThickness * (d.idx + 1)) + (d.idx * self.config.ringSpacing)),);
          });

    let firstCircle = this.micTimerGroup.selectAll(".firstCircle")
        .data(this.timeData, < any > function(d, i) { return d.idx; });

    //console.log(JSON.stringify(this.timeData));    
    //console.log(JSON.stringify(firstCircle));

    firstCircle.enter()
      .append("path")
        .attr("class", "firstCircle")
        .attr("d", firstCircleArc)
        .attr("filter", "url(#dropshadow)")
        .attr("transform", "translate(" + this.config.calc.radius + "," + this.config.calc.radius + ")" )
        .style("fill", this.config.colors.first)
      .merge(firstCircle);

    firstCircle.exit().remove();
  }

  // **
  // ** Draw the timer circles (second circles).
  // **
  drawSecondCircle(){
    // console.log('in drawSecondCircle');
    let self = this;
    let secondCircleArc = d3.arc()
      .startAngle(this.gaugeCircleX(0))
      .endAngle(< any > function(d) {
            return self.gaugeCircleX(d.baseZeroToOne);
          })
      .innerRadius(< any > function(d) {
            if (d.idx === 0) {
              return self.gaugeCircleY((self.config.rSize + self.config.rThickness * self.config.msShrinkFactor),);
            } else {
              return self.gaugeCircleY((self.config.rSize + (self.config.rThickness * d.idx) + (d.idx * self.config.ringSpacing)),);
            };
          })
      .outerRadius(< any > function(d) {
            return self.gaugeCircleY((self.config.rSize + (self.config.rThickness * (d.idx + 1)) + (d.idx * self.config.ringSpacing)),);
          });

    let secondCircle = this.micTimerGroup.selectAll(".secondCircle")
      .data(this.timeData, < any > function(d, i) { return d.idx; });

    secondCircle.enter()
      .append("path")
        .attr("class", "secondCircle")
        .attr("transform", "translate(" + this.config.calc.radius + "," + this.config.calc.radius + ")" )
      .merge(secondCircle)
        .style("fill", < any > function(d, i) {
            switch (self.config.calc.phase) {
              case 'ready': return self.getCircleColor(self.config.calc.phase);
              case 'warmup': { 
                  let warmUpColor = d3.rgb(self.getCircleColor(self.config.calc.phase));
                  warmUpColor.opacity = self.warmUpScale(self.config.calc.warmUpAlpha);
                  return warmUpColor;
              };
              case 'paused': { 
                  let pauseColor = d3.rgb(self.getCircleColor(self.config.calc.phase));
                  pauseColor.opacity = self.warmUpScale(self.config.calc.pauseAlpha);
                  return pauseColor;
              };
              case 'countdown': return self.getCircleColor(self.config.calc.phase);;
              case 'warning': return self.getCircleColor(self.config.calc.phase);;
              case 'stopped': return self.getCircleColor(self.config.calc.phase);;
              case 'finished': return self.getCircleColor(self.config.calc.phase);;
            }
        })
       .attr("d", secondCircleArc);

    secondCircle.exit().remove();
  }
  
  getCircleColor(key: string): string {
    console.log(key);
    console.log(this.config.colors[key]);
    return this.config.colors[key];
  }
  // ** 
  // ** Draw Counter Text
  // **
  drawCounterText(){
    console.log('in drawCounterText');
    let self = this;
    let singleDecValueIdx: number = this.getCounterDecValueIdx();
    let textShift = this.config.calc.counterTextPixels * 0.15;
    console.log(singleDecValueIdx);
    console.log(JSON.stringify(this.timeData));

    let ct = this.micTimerGroup.selectAll(".counterText")
      .data([this.timeData[singleDecValueIdx]]);

    ct.enter()
      .append("text")
        .attr("class", "counterText")
        .attr("text-anchor", "middle")
        .attr("font-size", this.config.calc.counterTextPixels + "px")
        .attr("transform", "translate(" + this.config.calc.radius + "," + (this.config.calc.radius + textShift) + ")" )
      .merge(ct)
        .style("fill", < any > function(d, i) {
          if (self.config.calc.phase === 'warmup') { 
            let warmupTextColor = d3.rgb(self.config.colors.text);
            warmupTextColor.opacity = self.warmUpScale(self.config.calc.warmUpAlpha);
            return warmupTextColor;
          } else if (self.config.calc.phase === 'paused') { 
            let pauseColor = d3.rgb(self.config.colors.text);
            pauseColor.opacity = self.warmUpScale(self.config.calc.pauseAlpha);
            return pauseColor;
          } else {
            return self.config.colors.text;
          }
        })
        .text(< any > function(d) {
          if (self.config.calc.phase === 'warmup') { 
            return self.config.calc.warmUpMessage;
          } else {
            let retVal = (d.singleDecValue.toFixed(2) < 1.0) ? d.singleDecValue.toFixed(2) : d.singleDecValue.toFixed(1);
            return retVal;
          }
        });

    ct.exit().remove();
  } 

  // ** 
  // ** Draw Time Units Text
  // **
  drawTimeUnitsText(){
    // console.log('in drawTimeUnitsText');
    let singleDecValueIdx: number = this.getCounterDecValueIdx();
    let shiftTimeUnitsText = this.config.calc.counterTextPixels * 0.25;

    let timeUnitsText = this.micTimerGroup.selectAll(".timeUnitsText")
      .data([this.timeData[singleDecValueIdx]]);

    timeUnitsText.enter()
      .append("text")
        .text(< any > function(d) {
            return d.t;
          })
        .attr("class", "timeUnitsText")
        .attr("text-anchor", "middle")
        .attr("font-size", this.config.calc.unitTextPixels + "px")
        .style("fill", this.config.colors.text)
        .attr("transform", "translate(" + this.config.calc.radius + "," + (this.config.calc.radius + this.config.calc.unitTextPixels + shiftTimeUnitsText) + ")" );

    timeUnitsText.exit().remove();
  }
}