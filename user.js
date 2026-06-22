// ==UserScript==
// @name         GeoFS Realistic Fuel Management System
// @namespace    geofs.fuelmanagement
// @version      1.1.o
// @author       Timmy Nguyen
// @description  Adds a real-world style Fuel Management / FMC fuel page to GeoFS, with Cost Index, dynamic fuel burn, engine fuel flow indicators, fuel-starvation engine cutoff, manual engine on/off toggle, and realistic gradual refueling. Press "Y" to toggle the panel, "E" to toggle engines on/off.
// @match        *://www.geo-fs.com/*
// @match        *://*.geo-fs.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/* eslint-disable no-undef */

(function () {
    'use strict';

    // =========================================================================
    // 1. AIRCRAFT PROFILE DATABASE
    // -------------------------------------------------------------------------
    // Each profile defines the real-world reference data used to drive the
    // fuel model. To add a new aircraft, simply add another entry here.
    //
    //   maxFuelKg      -> Maximum fuel capacity (kg)
    //   baseFFKgH      -> Baseline TOTAL fuel flow (kg/h) at a "reference"
    //                      cruise condition (CI ~ 50, mid throttle, FL350)
    //   engineCount    -> Number of engines (used to split fuel flow per engine)
    //   idleFactor     -> Fuel flow multiplier at idle throttle (ground idle)
    //   maxThrustFactor-> Fuel flow multiplier at full throttle (climb/TO)
    //   refuelRateKgMin-> Realistic ground refuel rate (kg per minute),
    //                      based on typical single/multi-point fueling rates
    // =========================================================================
const AIRCRAFT_PROFILES = {
        'B777-200': {
            label: 'Boeing 777-200',
            maxFuelKg: 94200,
            baseFFKgH: 6200,          
            engineCount: 2,
            idleFactor: 0.22,
            maxThrustFactor: 2.8,
            refuelRateKgMin: 2000
        },
        'B777-200ER': {
            label: 'Boeing 777-200ER',
            maxFuelKg: 137500,
            baseFFKgH: 6400,
            engineCount: 2,
            idleFactor: 0.22,
            maxThrustFactor: 2.9,
            refuelRateKgMin: 2400
        },
        'B777-200LR': {
            label: 'Boeing 777-200LR',
            maxFuelKg: 181280,        
            baseFFKgH: 6800,
            engineCount: 2,
            idleFactor: 0.22,
            maxThrustFactor: 3.1,
            refuelRateKgMin: 2500
        },
        'B777-300': {
            label: 'Boeing 777-300',
            maxFuelKg: 135500,
            baseFFKgH: 7200,
            engineCount: 2,
            idleFactor: 0.22,
            maxThrustFactor: 2.8,
            refuelRateKgMin: 2400
        },
        'B777-300ER': {
            label: 'Boeing 777-300ER',
            maxFuelKg: 145500,
            baseFFKgH: 7500,
            engineCount: 2,
            idleFactor: 0.22,
            maxThrustFactor: 3.0,
            refuelRateKgMin: 2500
        },
        'B777F': {
            label: 'Boeing 777 Freighter',
            maxFuelKg: 145500,
            baseFFKgH: 7100,
            engineCount: 2,
            idleFactor: 0.22,
            maxThrustFactor: 3.0,
            refuelRateKgMin: 2500
        },
        'B777-8': {
            label: 'Boeing 777-8',
            maxFuelKg: 158750,
            baseFFKgH: 6100,          
            engineCount: 2,
            idleFactor: 0.21,
            maxThrustFactor: 3.2,
            refuelRateKgMin: 2600
        },
        'B777-9': {
            label: 'Boeing 777-9',
            maxFuelKg: 158000,
            baseFFKgH: 6600,
            engineCount: 2,
            idleFactor: 0.21,
            maxThrustFactor: 3.1,
            refuelRateKgMin: 2600
        },
        'B747-8F': {
            label: 'Boeing 747-8F',
            maxFuelKg: 227600,
            baseFFKgH: 10100,         
            engineCount: 4,
            idleFactor: 0.20,
            maxThrustFactor: 2.8,
            refuelRateKgMin: 3200
        },
        'B747-400': {
            label: 'Boeing 747-400',
            maxFuelKg: 173390,
            baseFFKgH: 11200,         
            engineCount: 4,
            idleFactor: 0.22,
            maxThrustFactor: 2.7,
            refuelRateKgMin: 3000
        },
        'A380': {
            label: 'Airbus A380-800',
            maxFuelKg: 257500,        
            baseFFKgH: 11400,
            engineCount: 4,
            idleFactor: 0.20,
            maxThrustFactor: 2.6,
            refuelRateKgMin: 3600
        },
        'A350-900': {
            label: 'Airbus A350-900',
            maxFuelKg: 130500,        
            baseFFKgH: 5600,
            engineCount: 2,
            idleFactor: 0.23,
            maxThrustFactor: 3.2,
            refuelRateKgMin: 2200
        },
        'A350-900ULR': {
            label: 'Airbus A350-900ULR',
            maxFuelKg: 166000,
            baseFFKgH: 5600,
            engineCount: 2,
            idleFactor: 0.23,
            maxThrustFactor: 3.2,
            refuelRateKgMin: 2200
        },
        'A350-1000': {
            label: 'Airbus A350-1000',
            maxFuelKg: 129500,
            baseFFKgH: 6200,
            engineCount: 2,
            idleFactor: 0.22,
            maxThrustFactor: 3.1,
            refuelRateKgMin: 2400
        },
        'A350-1000ULR': {
            label: 'Airbus A350-1000ULR',
            maxFuelKg: 159000,
            baseFFKgH: 6200,
            engineCount: 2,
            idleFactor: 0.22,
            maxThrustFactor: 3.1,
            refuelRateKgMin: 2400
        },
        'B787-9': {
            label: 'Boeing 787-9 Dreamliner',
            maxFuelKg: 101320,
            baseFFKgH: 4900,
            engineCount: 2,
            idleFactor: 0.22,
            maxThrustFactor: 3.2,
            refuelRateKgMin: 2000
        },
        'B787-10': {
            label: 'Boeing 787-10 Dreamliner',
            maxFuelKg: 101320,
            baseFFKgH: 5300,
            engineCount: 2,
            idleFactor: 0.22,
            maxThrustFactor: 3.1,
            refuelRateKgMin: 2000
        },
        'A330-200': {
            label: 'Airbus A330-200',
            maxFuelKg: 109190,
            baseFFKgH: 5600,
            engineCount: 2,
            idleFactor: 0.24,
            maxThrustFactor: 3.0,
            refuelRateKgMin: 2100
        },
        'A330-300': {
            label: 'Airbus A330-300',
            maxFuelKg: 78000,
            baseFFKgH: 5800,
            engineCount: 2,
            idleFactor: 0.24,
            maxThrustFactor: 2.9,
            refuelRateKgMin: 1800
        },
        'A330-900': {
            label: 'Airbus A330-900neo',
            maxFuelKg: 111000,
            baseFFKgH: 4800,
            engineCount: 2,
            idleFactor: 0.23,
            maxThrustFactor: 3.1,
            refuelRateKgMin: 2100
        },
        'A340-600': {
            label: 'Airbus A340-600',
            maxFuelKg: 156000,
            baseFFKgH: 9400,
            engineCount: 4,
            idleFactor: 0.21,
            maxThrustFactor: 2.8,
            refuelRateKgMin: 2800
        },
        'MD-11': {
            label: 'McDonnell Douglas MD-11',
            maxFuelKg: 117450,
            baseFFKgH: 7800,
            engineCount: 3,
            idleFactor: 0.22,
            maxThrustFactor: 2.9,
            refuelRateKgMin: 2300
        },

        // ---- Airbus A320 Family ----
        'A318': {
            label: 'Airbus A318-100',
            maxFuelKg: 19140,
            baseFFKgH: 2200,
            engineCount: 2,
            idleFactor: 0.25,
            maxThrustFactor: 3.2,
            refuelRateKgMin: 1100
        },
        'A319': {
            label: 'Airbus A319-100',
            maxFuelKg: 19140,
            baseFFKgH: 2300,
            engineCount: 2,
            idleFactor: 0.25,
            maxThrustFactor: 3.1,
            refuelRateKgMin: 1100
        },
        'A320': {
            label: 'Airbus A320neo',
            maxFuelKg: 24210,
            baseFFKgH: 2100,
            engineCount: 2,
            idleFactor: 0.25,
            maxThrustFactor: 3.2,
            refuelRateKgMin: 1200
        },
        'A321-200': {
            label: 'Airbus A321-200',
            maxFuelKg: 23200,
            baseFFKgH: 2700,
            engineCount: 2,
            idleFactor: 0.24,
            maxThrustFactor: 3.0,
            refuelRateKgMin: 1100
        },
        'A321neo': {
            label: 'Airbus A321neo',
            maxFuelKg: 24600,
            baseFFKgH: 2250,
            engineCount: 2,
            idleFactor: 0.25,
            maxThrustFactor: 3.2,
            refuelRateKgMin: 1200
        },
        'A321XLR': {
            label: 'Airbus A321XLR',
            maxFuelKg: 32900,        
            baseFFKgH: 2300,
            engineCount: 2,
            idleFactor: 0.25,
            maxThrustFactor: 3.3,
            refuelRateKgMin: 1300
        },
        'A220-100': {
            label: 'Airbus A220-100',
            maxFuelKg: 17200,
            baseFFKgH: 1650,
            engineCount: 2,
            idleFactor: 0.26,
            maxThrustFactor: 3.1,
            refuelRateKgMin: 950
        },
        'A220-300': {
            label: 'Airbus A220-300',
            maxFuelKg: 19300,
            baseFFKgH: 1800,
            engineCount: 2,
            idleFactor: 0.26,
            maxThrustFactor: 3.2,
            refuelRateKgMin: 1000
        },

        // ---- Boeing 737 Next Generation (NG) ----
        'B737-700': {
            label: 'Boeing 737-700',
            maxFuelKg: 20540,
            baseFFKgH: 2400,
            engineCount: 2,
            idleFactor: 0.24,
            maxThrustFactor: 3.0,
            refuelRateKgMin: 1100
        },
        'B737-800': {
            label: 'Boeing 737-800',
            maxFuelKg: 20890,
            baseFFKgH: 2550,
            engineCount: 2,
            idleFactor: 0.24,
            maxThrustFactor: 3.1,
            refuelRateKgMin: 1100
        },
        'B737-900ER': {
            label: 'Boeing 737-900ER',
            maxFuelKg: 20890,
            baseFFKgH: 2680,
            engineCount: 2,
            idleFactor: 0.23,
            maxThrustFactor: 3.0,
            refuelRateKgMin: 1100
        },

        // ---- Boeing 737 MAX Family ----
        'B737-MAX8': {
            label: 'Boeing 737 MAX 8',
            maxFuelKg: 20730,
            baseFFKgH: 2180,
            engineCount: 2,
            idleFactor: 0.25,
            maxThrustFactor: 3.3,
            refuelRateKgMin: 1100
        },
        'B737-MAX9': {
            label: 'Boeing 737 MAX 9',
            maxFuelKg: 20730,
            baseFFKgH: 2280,
            engineCount: 2,
            idleFactor: 0.25,
            maxThrustFactor: 3.2,
            refuelRateKgMin: 1100
        },
        'B737-MAX10': {
            label: 'Boeing 737 MAX 10',
            maxFuelKg: 20730,
            baseFFKgH: 2380,
            engineCount: 2,
            idleFactor: 0.24,
            maxThrustFactor: 3.2,
            refuelRateKgMin: 1150
        },

        // ---- Boeing 757 Family ----
        'B757-200': {
            label: 'Boeing 757-200',
            maxFuelKg: 34490,
            baseFFKgH: 3300,
            engineCount: 2,
            idleFactor: 0.23,
            maxThrustFactor: 3.4,
            refuelRateKgMin: 1400
        },
        'B757-300': {
            label: 'Boeing 757-300',
            maxFuelKg: 34490,
            baseFFKgH: 3650,
            engineCount: 2,
            idleFactor: 0.22,
            maxThrustFactor: 3.2,
            refuelRateKgMin: 1400
        },

        // ---- Regional ----
        'Saab340': {
            label: 'Saab 340',
            maxFuelKg: 2580,
            baseFFKgH: 420,
            engineCount: 2,
            idleFactor: 0.32,
            maxThrustFactor: 2.1,
            refuelRateKgMin: 250
        },
        'ATR42-600': {
            label: 'ATR 42-600',
            maxFuelKg: 4500,
            baseFFKgH: 480,
            engineCount: 2,
            idleFactor: 0.30,
            maxThrustFactor: 2.3,
            refuelRateKgMin: 350
        },
        'ATR72-600': {
            label: 'ATR 72-600',
            maxFuelKg: 5000,
            baseFFKgH: 590,
            engineCount: 2,
            idleFactor: 0.30,
            maxThrustFactor: 2.2,
            refuelRateKgMin: 400
        },
        'DASH8-Q400': {
            label: 'Dash 8 Q400',
            maxFuelKg: 5220,
            baseFFKgH: 950,
            engineCount: 2,
            idleFactor: 0.28,
            maxThrustFactor: 2.5,
            refuelRateKgMin: 450
        },
        'CRJ200': {
            label: 'Bombardier CRJ200',
            maxFuelKg: 6490,
            baseFFKgH: 1100,
            engineCount: 2,
            idleFactor: 0.24,
            maxThrustFactor: 3.0,
            refuelRateKgMin: 600
        },
        'CRJ700': {
            label: 'Bombardier CRJ700',
            maxFuelKg: 8850,
            baseFFKgH: 1420,
            engineCount: 2,
            idleFactor: 0.24,
            maxThrustFactor: 3.1,
            refuelRateKgMin: 700
        },
        'CRJ900': {
            label: 'Bombardier CRJ900',
            maxFuelKg: 8850,
            baseFFKgH: 1620,
            engineCount: 2,
            idleFactor: 0.24,
            maxThrustFactor: 3.0,
            refuelRateKgMin: 750
        },

        // ---- General Aviation ----
        'C152': {
            label: 'Cessna 152',
            maxFuelKg: 72,
            baseFFKgH: 16,
            engineCount: 1,
            idleFactor: 0.35,
            maxThrustFactor: 1.9,
            refuelRateKgMin: 20
        },
        'C172': {
            label: 'Cessna 172 Skyhawk',
            maxFuelKg: 144,
            baseFFKgH: 24,            
            engineCount: 1,
            idleFactor: 0.35,
            maxThrustFactor: 2.0,
            refuelRateKgMin: 30
        }
};

    class FuelManager {
        constructor() {
            this.aircraftKey = 'B777-300ER';
            this.profile = AIRCRAFT_PROFILES[this.aircraftKey];
            this.costIndex = 50;          
            this.fuelKg = this.profile.maxFuelKg;
            this.currentFFKgH = 0;        
            this.lastUpdate = performance.now();

            
            this.engineFailed = false;      
            this.engineManuallyOff = false; 

            // --- Realistic gradual refueling state ---
            this.isRefueling = false;
            this.refuelTargetKg = this.fuelKg;
        }

        setAircraft(key) {
            if (!AIRCRAFT_PROFILES[key]) return;
            this.aircraftKey = key;
            this.profile = AIRCRAFT_PROFILES[key];
            this.fuelKg = this.profile.maxFuelKg;
            this.refuelTargetKg = this.fuelKg;
            this.isRefueling = false;
            this.engineFailed = false;
            this.engineManuallyOff = false;
        }

        setCostIndex(ci) {
            ci = Math.max(0, Math.min(999, Math.round(ci)));
            this.costIndex = ci;
        }

        setFuelKg(kg) {
            kg = Math.max(0, Math.min(this.profile.maxFuelKg, kg));
            this.fuelKg = kg;
            if (this.fuelKg > 0) this.engineFailed = false;
        }

        refuelFull() {
            this.startRefuel(this.profile.maxFuelKg);
        }

       
        toggleEngine() {
            this.engineManuallyOff = !this.engineManuallyOff;

          
            if (!this.engineManuallyOff && this.fuelKg <= 0) {
                this.engineFailed = true;
                this.enforceEngineCutoff();
            }
        }

       
        startRefuel(targetKg) {
            targetKg = Math.max(0, Math.min(this.profile.maxFuelKg, targetKg));
            this.refuelTargetKg = targetKg;

            if (Math.abs(targetKg - this.fuelKg) < 0.5) return;

            this.isRefueling = true;
        }

        cancelRefuel() {
            this.isRefueling = false;
        }

     
        getRefuelETASeconds() {
            if (!this.isRefueling) return 0;
            const remainingKg = Math.abs(this.refuelTargetKg - this.fuelKg);
            const ratePerSec = this.profile.refuelRateKgMin / 60;
            if (ratePerSec <= 0) return 0;
            return remainingKg / ratePerSec;
        }


        readGeoFSState() {
            let throttle = 0;     
            let altitudeM = 0;    
            let onGround = true;

            try {
                if (window.geofs && geofs.aircraft && geofs.aircraft.instance) {
                    const ac = geofs.aircraft.instance;

                    if (ac.animationValue && typeof ac.animationValue.throttle === 'number') {
                        throttle = ac.animationValue.throttle;
                    } else if (ac.controls && typeof ac.controls.throttle === 'number') {
                        throttle = ac.controls.throttle;
                    }

                    if (Array.isArray(ac.llaLocation) && typeof ac.llaLocation[2] === 'number') {
                        altitudeM = ac.llaLocation[2];
                    }

                    if (typeof ac.groundContact === 'boolean') {
                        onGround = ac.groundContact;
                    } else {
                        onGround = altitudeM < 2;
                    }
                }
            } catch (e) {
              
            }

            return { throttle, altitudeM, onGround };
        }


        computeFuelFlow(throttle, altitudeM) {
            const p = this.profile;

            const ciFactor = 0.82 + (this.costIndex / 999) * 0.53;

        
            const throttleFactor = p.idleFactor +
                (p.maxThrustFactor - p.idleFactor) * Math.pow(throttle, 1.15);

            const refAltitude = 10668; // meters
            const altRatio = Math.min(altitudeM, 12500) / refAltitude;

            const altitudeFactor = 1.15 - (0.15 * altRatio);

            const totalFF = p.baseFFKgH * ciFactor * throttleFactor * altitudeFactor;
            return Math.max(0, totalFF);
        }


        enforceEngineCutoff() {
            try {
                if (window.geofs && geofs.aircraft && geofs.aircraft.instance) {
                    const ac = geofs.aircraft.instance;

                    // Zero out throttle controls
                    if (ac.controls && typeof ac.controls.throttle === 'number') {
                        ac.controls.throttle = 0;
                    }
                    if (ac.animationValue && typeof ac.animationValue.throttle === 'number') {
                        ac.animationValue.throttle = 0;
                    }

                    // Some GeoFS builds expose a setThrottle helper
                    if (typeof ac.setThrottle === 'function') {
                        ac.setThrottle(0);
                    }

                    // Mark individual engines as not running, if exposed
                    if (Array.isArray(ac.engines)) {
                        ac.engines.forEach((eng) => {
                            if (eng && typeof eng === 'object') {
                                eng.running = false;
                                if (typeof eng.rpm === 'number') eng.rpm = 0;
                            }
                        });
                    }
                }
            } catch (e) {

            }
        }
        update() {
            const now = performance.now();
            const dtSeconds = (now - this.lastUpdate) / 1000;
            this.lastUpdate = now;

           
            if (this.isRefueling) {
                const ratePerSec = this.profile.refuelRateKgMin / 60;
                const step = ratePerSec * dtSeconds;

                if (this.fuelKg < this.refuelTargetKg) {
                    this.fuelKg = Math.min(this.refuelTargetKg, this.fuelKg + step);
                } else if (this.fuelKg > this.refuelTargetKg) {
                    this.fuelKg = Math.max(this.refuelTargetKg, this.fuelKg - step);
                }

                if (Math.abs(this.fuelKg - this.refuelTargetKg) < 0.5) {
                    this.fuelKg = this.refuelTargetKg;
                    this.isRefueling = false;
                }

                if (this.fuelKg > 0) this.engineFailed = false;
            }

            const { throttle, altitudeM } = this.readGeoFSState();
            this.lastThrottle = throttle;
            this.lastAltitudeM = altitudeM;

            if (this.engineManuallyOff) {
                this.currentFFKgH = 0;
                this.enforceEngineCutoff();
                return;
            }

            if (this.fuelKg <= 0) {
                this.fuelKg = 0;
                this.engineFailed = true;
            }

            if (this.engineFailed) {
                this.currentFFKgH = 0;
                this.enforceEngineCutoff();
                return;
            }

            this.currentFFKgH = this.computeFuelFlow(throttle, altitudeM);

            // Deplete fuel (kg/h -> kg/s)
            const burnThisTick = (this.currentFFKgH / 3600) * dtSeconds;
            this.fuelKg = Math.max(0, this.fuelKg - burnThisTick);

            if (this.fuelKg <= 0) {
                this.fuelKg = 0;
                this.engineFailed = true;
                this.currentFFKgH = 0;
                this.enforceEngineCutoff();
            }
        }


        getEndurance() {
            if (this.currentFFKgH <= 0) {
                return { hours: 99, minutes: 59 }; // effectively "infinite"
            }
            const hoursFloat = this.fuelKg / this.currentFFKgH;
            const hours = Math.floor(hoursFloat);
            const minutes = Math.round((hoursFloat - hours) * 60);
            return { hours, minutes };
        }

        getPerEngineFF() {
            const n = this.profile.engineCount || 1;
            const perEngine = this.currentFFKgH / n;
            const arr = [];
            for (let i = 0; i < n; i++) arr.push(perEngine);
            return arr;
        }

        getFuelPercent() {
            return (this.fuelKg / this.profile.maxFuelKg) * 100;
        }
    }


    class FuelUI {
        constructor(fuelManager) {
            this.fm = fuelManager;
            this.visible = false;
            this.root = null;
            this._buildStyles();
            this._buildDOM();
            this._bindEvents();
        }

        // -- Styles ------------------------------------------------------
        _buildStyles() {
            const style = document.createElement('style');
            style.textContent = `
                @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap');

                #gfs-fuel-panel {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    width: 320px;
                    background: linear-gradient(180deg, #11161c 0%, #0a0d11 100%);
                    border: 1px solid #2a3540;
                    border-radius: 8px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                    font-family: 'Roboto Mono', monospace;
                    color: #c9d6df;
                    z-index: 999999;
                    user-select: none;
                    opacity: 0;
                    transform: translateY(-12px) scale(0.98);
                    pointer-events: none;
                    transition: opacity 0.25s ease, transform 0.25s ease;
                }
                #gfs-fuel-panel.gfs-visible {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    pointer-events: auto;
                }

                #gfs-fuel-panel .gfs-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: #161d24;
                    border-bottom: 1px solid #2a3540;
                    border-radius: 8px 8px 0 0;
                    letter-spacing: 1px;
                }
                #gfs-fuel-panel .gfs-header .gfs-title {
                    font-size: 12px;
                    font-weight: 700;
                    color: #7fd0ff;
                }
                #gfs-fuel-panel .gfs-header .gfs-sub {
                    font-size: 10px;
                    color: #5f7480;
                }

                #gfs-fuel-panel .gfs-body { padding: 12px; }

                #gfs-fuel-panel .gfs-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                #gfs-fuel-panel label {
                    font-size: 11px;
                    color: #7f97a3;
                    letter-spacing: 1px;
                }

                #gfs-fuel-panel select,
                #gfs-fuel-panel input[type="number"] {
                    background: #0f1419;
                    border: 1px solid #2a3540;
                    color: #d6e6ee;
                    font-family: 'Roboto Mono', monospace;
                    font-size: 12px;
                    border-radius: 4px;
                    padding: 4px 6px;
                    width: 110px;
                    text-align: right;
                }
                #gfs-fuel-panel select { width: 170px; text-align: left; }

                #gfs-fuel-panel .gfs-divider {
                    border-top: 1px dashed #2a3540;
                    margin: 10px 0;
                }

                #gfs-fuel-panel .gfs-fmc {
                    background: #05080b;
                    border: 1px solid #1c252c;
                    border-radius: 6px;
                    padding: 10px;
                }

                #gfs-fuel-panel .gfs-fmc-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    margin-bottom: 6px;
                    font-size: 13px;
                }
                #gfs-fuel-panel .gfs-fmc-row .gfs-label {
                    color: #6fe0a0;
                    font-size: 11px;
                    letter-spacing: 1px;
                }
                #gfs-fuel-panel .gfs-fmc-row .gfs-value {
                    font-weight: 700;
                    font-size: 15px;
                    color: #d6f5e2;
                    letter-spacing: 1px;
                }

                /* Fuel quantity color states */
                #gfs-fuel-panel .gfs-fob.gfs-normal { color: #6fe07a; }
                #gfs-fuel-panel .gfs-fob.gfs-caution { color: #ffd166; }
                #gfs-fuel-panel .gfs-fob.gfs-low { color: #ff5c5c; }

                #gfs-fuel-panel .gfs-engines {
                    display: flex;
                    gap: 6px;
                    margin-top: 8px;
                }
                #gfs-fuel-panel .gfs-engine {
                    flex: 1;
                    background: #0c1116;
                    border: 1px solid #1c252c;
                    border-radius: 4px;
                    padding: 6px 4px;
                    text-align: center;
                }
                #gfs-fuel-panel .gfs-engine .gfs-eng-label {
                    font-size: 10px;
                    color: #7f97a3;
                    letter-spacing: 1px;
                    display: block;
                    margin-bottom: 4px;
                }
                #gfs-fuel-panel .gfs-engine .gfs-eng-value {
                    font-size: 12px;
                    font-weight: 700;
                    color: #9be8ff;
                }
                #gfs-fuel-panel .gfs-engine .gfs-eng-bar {
                    height: 4px;
                    border-radius: 2px;
                    background: #1c252c;
                    margin-top: 5px;
                    overflow: hidden;
                }
                #gfs-fuel-panel .gfs-engine .gfs-eng-bar-fill {
                    height: 100%;
                    background: #4fd1ff;
                    width: 0%;
                    transition: width 0.3s ease;
                }

                #gfs-fuel-panel .gfs-progress {
                    height: 8px;
                    border-radius: 4px;
                    background: #1c252c;
                    overflow: hidden;
                    margin-top: 8px;
                }
                #gfs-fuel-panel .gfs-progress-fill {
                    height: 100%;
                    transition: width 0.4s ease, background-color 0.4s ease;
                }

                #gfs-fuel-panel .gfs-buttons {
                    display: flex;
                    gap: 8px;
                    margin-top: 10px;
                }
                #gfs-fuel-panel button {
                    flex: 1;
                    background: #16222b;
                    border: 1px solid #2a3540;
                    color: #c9d6df;
                    font-family: 'Roboto Mono', monospace;
                    font-size: 11px;
                    letter-spacing: 1px;
                    border-radius: 4px;
                    padding: 6px 4px;
                    cursor: pointer;
                    transition: background 0.2s ease, border-color 0.2s ease;
                }
                #gfs-fuel-panel button:hover {
                    background: #1e2e3a;
                    border-color: #3a4d5c;
                }

                #gfs-fuel-panel .gfs-hint {
                    margin-top: 10px;
                    font-size: 10px;
                    color: #4a5b66;
                    text-align: center;
                    letter-spacing: 1px;
                }

                /* Engine status indicator */
                #gfs-fuel-panel .gfs-status-ok {
                    color: #6fe07a;
                    font-weight: 700;
                }
                #gfs-fuel-panel .gfs-status-fail {
                    color: #ff5c5c;
                    font-weight: 700;
                    animation: gfs-blink 1s steps(1, end) infinite;
                }
                #gfs-fuel-panel .gfs-status-manual-off {
                    color: #ffd166;
                    font-weight: 700;
                    animation: gfs-blink 1s steps(1, end) infinite;
                }
                @keyframes gfs-blink {
                    50% { opacity: 0.25; }
                }

                /* Refuel section */
                #gfs-fuel-panel .gfs-refuel-row {
                    display: flex;
                    gap: 6px;
                    margin-top: 8px;
                }
                #gfs-fuel-panel .gfs-refuel-row input[type="number"] {
                    flex: 1;
                    width: auto;
                }
                #gfs-fuel-panel .gfs-refuel-row button {
                    flex: none;
                    width: 90px;
                }
                #gfs-fuel-panel .gfs-refuel-status {
                    margin-top: 6px;
                    font-size: 10px;
                    color: #9be8ff;
                    text-align: center;
                    letter-spacing: 1px;
                    min-height: 12px;
                }

                /* Engine power toggle button */
                #gfs-fuel-panel #gfs-engine-toggle-btn {
                    margin-top: 8px;
                    width: 100%;
                }
                #gfs-fuel-panel #gfs-engine-toggle-btn.gfs-eng-on {
                    border-color: #3a5c3a;
                    color: #9be09b;
                }
                #gfs-fuel-panel #gfs-engine-toggle-btn.gfs-eng-off {
                    border-color: #5c3a3a;
                    color: #e0a09b;
                }
            `;
            document.head.appendChild(style);
        }

        // -- DOM construction --------------------------------------------
        _buildDOM() {
            const root = document.createElement('div');
            root.id = 'gfs-fuel-panel';

            root.innerHTML = `
                <div class="gfs-header">
                    <div class="gfs-title">FUEL MGMT &nbsp;/ FMC FUEL PAGE</div>
                    <div class="gfs-sub">[Y] HIDE &nbsp;|&nbsp; [E] ENGINES</div>
                </div>
                <div class="gfs-body">

                    <div class="gfs-row">
                        <label>AIRCRAFT TYPE</label>
                        <select id="gfs-aircraft-select"></select>
                    </div>

                    <div class="gfs-row">
                        <label>COST INDEX (0-999)</label>
                        <input type="number" id="gfs-ci-input" min="0" max="999" step="1" value="50">
                    </div>

                    <div class="gfs-row">
                        <label>MAX FUEL CAPACITY</label>
                        <span id="gfs-max-fuel" class="gfs-value-static">-- KG</span>
                    </div>

                    <div class="gfs-divider"></div>

                    <div class="gfs-fmc">
                        <div class="gfs-fmc-row">
                            <span class="gfs-label">FOB (FUEL ON BOARD)</span>
                            <span id="gfs-fob" class="gfs-value gfs-fob gfs-normal">-- KG</span>
                        </div>
                        <div class="gfs-fmc-row">
                            <span class="gfs-label">FF (FUEL FLOW TOTAL)</span>
                            <span id="gfs-ff" class="gfs-value">-- KG/H</span>
                        </div>
                        <div class="gfs-fmc-row">
                            <span class="gfs-label">EST ENDURANCE (HH:MM)</span>
                            <span id="gfs-endurance" class="gfs-value">--:--</span>
                        </div>
                        <div class="gfs-fmc-row">
                            <span class="gfs-label">ENGINE STATUS</span>
                            <span id="gfs-engine-status" class="gfs-value gfs-status-ok">RUNNING</span>
                        </div>

                        <div class="gfs-progress">
                            <div id="gfs-progress-fill" class="gfs-progress-fill" style="width:100%; background:#6fe07a;"></div>
                        </div>

                        <div class="gfs-engines" id="gfs-engines"></div>

                        <button id="gfs-engine-toggle-btn" class="gfs-eng-on">ENGINES: ON &nbsp;(PRESS E)</button>
                    </div>

                    <div class="gfs-divider"></div>

                    <div class="gfs-row">
                        <label>REFUEL TARGET (KG)</label>
                    </div>
                    <div class="gfs-refuel-row">
                        <input type="number" id="gfs-refuel-target" min="0" step="100" placeholder="TARGET KG">
                        <button id="gfs-refuel-btn">REFUEL</button>
                        <button id="gfs-refuel-full-btn">FULL</button>
                    </div>
                    <div class="gfs-refuel-row">
                        <button id="gfs-refuel-cancel-btn">CANCEL REFUEL</button>
                    </div>
                    <div id="gfs-refuel-status" class="gfs-refuel-status"></div>

                    <div class="gfs-hint">GeoFS Fuel Management Addon v1.2</div>
                </div>
            `;

            document.body.appendChild(root);
            this.root = root;

            const select = root.querySelector('#gfs-aircraft-select');
            Object.keys(AIRCRAFT_PROFILES).forEach((key) => {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = AIRCRAFT_PROFILES[key].label;
                if (key === this.fm.aircraftKey) opt.selected = true;
                select.appendChild(opt);
            });

            this._buildEngineIndicators();
            this._refreshStaticInfo();
        }


        _buildEngineIndicators() {
            const container = this.root.querySelector('#gfs-engines');
            container.innerHTML = '';
            const n = this.fm.profile.engineCount;
            for (let i = 1; i <= n; i++) {
                const block = document.createElement('div');
                block.className = 'gfs-engine';
                block.innerHTML = `
                    <span class="gfs-eng-label">ENG ${i}</span>
                    <span class="gfs-eng-value" data-eng="${i}">-- KG/H</span>
                    <div class="gfs-eng-bar"><div class="gfs-eng-bar-fill" data-eng-bar="${i}"></div></div>
                `;
                container.appendChild(block);
            }
        }

        _refreshStaticInfo() {
            const maxFuelEl = this.root.querySelector('#gfs-max-fuel');
            maxFuelEl.textContent = `${this.fm.profile.maxFuelKg.toLocaleString()} KG`;

            const ciInput = this.root.querySelector('#gfs-ci-input');
            ciInput.value = this.fm.costIndex;

            const refuelTargetInput = this.root.querySelector('#gfs-refuel-target');
            refuelTargetInput.value = Math.round(this.fm.fuelKg);
            refuelTargetInput.max = this.fm.profile.maxFuelKg;
        }


        _bindEvents() {

            window.addEventListener('keydown', (e) => {
  
                const tag = (e.target && e.target.tagName) || '';
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;

                if (!e.key) return;
                const key = e.key.toLowerCase();

                if (key === 'y') {
                    this.toggle();
                } else if (key === 'e') {
                    this.fm.toggleEngine();
                }
            });

            // Aircraft selection
            this.root.querySelector('#gfs-aircraft-select').addEventListener('change', (e) => {
                this.fm.setAircraft(e.target.value);
                this._buildEngineIndicators();
                this._refreshStaticInfo();
            });

            const ciInput = this.root.querySelector('#gfs-ci-input');
            ciInput.addEventListener('change', (e) => {
                let val = parseInt(e.target.value, 10);
                if (isNaN(val)) val = 50;
                this.fm.setCostIndex(val);
                ciInput.value = this.fm.costIndex;
            });
            const refuelTargetInput = this.root.querySelector('#gfs-refuel-target');
            this.root.querySelector('#gfs-refuel-btn').addEventListener('click', () => {
                let val = parseFloat(refuelTargetInput.value);
                if (isNaN(val)) {
                    val = this.fm.fuelKg;
                }
                this.fm.startRefuel(val);
            });

            this.root.querySelector('#gfs-refuel-full-btn').addEventListener('click', () => {
                refuelTargetInput.value = this.fm.profile.maxFuelKg;
                this.fm.refuelFull();
            });

            this.root.querySelector('#gfs-refuel-cancel-btn').addEventListener('click', () => {
                this.fm.cancelRefuel();
            });

          
            this.root.querySelector('#gfs-engine-toggle-btn').addEventListener('click', () => {
                this.fm.toggleEngine();
            });
        }

        toggle() {
            this.visible = !this.visible;
            this.root.classList.toggle('gfs-visible', this.visible);
        }

        refresh() {
            const fm = this.fm;

            const fobEl = this.root.querySelector('#gfs-fob');
            fobEl.textContent = `${Math.round(fm.fuelKg).toLocaleString()} KG`;

            const pct = fm.getFuelPercent();
            fobEl.classList.remove('gfs-normal', 'gfs-caution', 'gfs-low');
            let barColor = '#6fe07a';
            if (pct <= 10) {
                fobEl.classList.add('gfs-low');
                barColor = '#ff5c5c';
            } else if (pct <= 20) {
                fobEl.classList.add('gfs-caution');
                barColor = '#ffd166';
            } else {
                fobEl.classList.add('gfs-normal');
            }

    
            const progressFill = this.root.querySelector('#gfs-progress-fill');
            progressFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
            progressFill.style.background = barColor;

            const ffEl = this.root.querySelector('#gfs-ff');
            ffEl.textContent = `${Math.round(fm.currentFFKgH).toLocaleString()} KG/H`;

            const endurance = fm.getEndurance();
            const endEl = this.root.querySelector('#gfs-endurance');
            const hh = String(endurance.hours).padStart(2, '0');
            const mm = String(endurance.minutes).padStart(2, '0');
            endEl.textContent = `${hh}:${mm}`;

            const statusEl = this.root.querySelector('#gfs-engine-status');
            statusEl.classList.remove('gfs-status-ok', 'gfs-status-fail', 'gfs-status-manual-off');
            if (fm.engineManuallyOff) {
                statusEl.textContent = 'ENGINES OFF (MANUAL)';
                statusEl.classList.add('gfs-status-manual-off');
            } else if (fm.engineFailed) {
                statusEl.textContent = 'FUEL STARVATION - ENG OUT';
                statusEl.classList.add('gfs-status-fail');
            } else {
                statusEl.textContent = 'RUNNING';
                statusEl.classList.add('gfs-status-ok');
            }

            const toggleBtn = this.root.querySelector('#gfs-engine-toggle-btn');
            if (fm.engineManuallyOff) {
                toggleBtn.textContent = 'ENGINES: OFF  (PRESS E)';
                toggleBtn.classList.remove('gfs-eng-on');
                toggleBtn.classList.add('gfs-eng-off');
            } else {
                toggleBtn.textContent = 'ENGINES: ON  (PRESS E)';
                toggleBtn.classList.remove('gfs-eng-off');
                toggleBtn.classList.add('gfs-eng-on');
            }

            // Per-engine readouts
            const perEngine = fm.getPerEngineFF();
            const maxPerEngine = (fm.profile.baseFFKgH * fm.profile.maxThrustFactor) / fm.profile.engineCount;
            perEngine.forEach((ff, idx) => {
                const i = idx + 1;
                const valEl = this.root.querySelector(`[data-eng="${i}"]`);
                const barEl = this.root.querySelector(`[data-eng-bar="${i}"]`);
                if (valEl) valEl.textContent = `${Math.round(ff).toLocaleString()} KG/H`;
                if (barEl) {
                    const barPct = Math.max(0, Math.min(100, (ff / maxPerEngine) * 100));
                    barEl.style.width = `${barPct}%`;
                }
            });


            const refuelStatusEl = this.root.querySelector('#gfs-refuel-status');
            if (fm.isRefueling) {
                const etaSec = fm.getRefuelETASeconds();
                const etaMin = Math.floor(etaSec / 60);
                const etaSecRem = Math.round(etaSec % 60);
                const direction = fm.fuelKg < fm.refuelTargetKg ? 'FUELING' : 'DEFUELING';
                refuelStatusEl.textContent =
                    `${direction}... TARGET ${Math.round(fm.refuelTargetKg).toLocaleString()} KG ` +
                    `(ETA ${etaMin}:${String(etaSecRem).padStart(2, '0')})`;
            } else {
                refuelStatusEl.textContent = '';
            }
        }
    }

    function init() {
        const fuelManager = new FuelManager();
        const ui = new FuelUI(fuelManager);

        setInterval(() => {
            fuelManager.update();
            ui.refresh();
        }, 250);
    }

    if (document.body) {
        init();
    } else {
        window.addEventListener('DOMContentLoaded', init);
    }
})();
