const threads = require("worker_threads");
const myName = 'Butcher';
const spares0 = [8, 8, 8, 4, 4, 4 ];
let spares = [8, 8, 8, 4, 4, 4 ];        //qty of cards with value = 2,3,4,5,6,7
let probEdge;
const hand = [];
let countCards = false;
let score = 0;
let restOfDeck = 52;
let msg;
let playerEdge;

threads.parentPort.on("message", t => { 
    
    switch (t.cmd) {
        case 'i':   countCards = t.body.c;
                    playerEdge = t.body.e || 17;
                    probEdge = t.body.p || 0.5;
                    break; 

        case 'n':   threads.parentPort.postMessage({cmd: 'd',hand: hand, score: score});
                    hand.splice(0);
                    score = 0;                                    
                    break;

        case 'c':   if (countCards) {
                        restOfDeck --;
                        if (t.body.val < 8) spares[t.body.val-2] --;
                    }
                    hand.push(t.body);
                    score += t.body.val;                    
                    threads.parentPort.postMessage({cmd: 'g', body: t.body, score: score});

                    if (score == 21 ||(hand.length == 2 && score == 22)) {       //2 aces
                        msg = 'w';                          //Won
                    } else if (score > 21) {               
                        msg = 'l';                          //Lost
                    } else if (score == 20) {
                        msg = 's';                          //Stop at 20
                    } else if (score > playerEdge) {
                        let prob = countCards? 
                            spares.slice(0, 20 - score).reduce((a,b) => a + b, 0) / restOfDeck: 0;
                        msg = prob < probEdge ? 's': 'm';                                           // Stop: More
                    } else msg = 'm';
                    threads.parentPort.postMessage({cmd: msg, hand: hand, score: score});
                    break;

        case 'd':   if (t.body.name != myName) {
                        restOfDeck -= t.body.hand.length;
                        for (let s of t.body.hand) {
                            if (s.val < 8) spares[s.val-2] --; 
                        }
                    }
                    break;

        case 'a':   restOfDeck += 52;
                    spares = spares.map((value, index) => { return value + spares0[index] });
                    break;            
    }

});
