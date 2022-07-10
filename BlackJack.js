const threads = require("worker_threads");

const suits  = ['spades', 'clubs', 'diamonds', 'hearts'];
const names = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const vals = [2,3,4,5,6,7,8,9,10,2,3,4,11];         //74 per 1 suit,  296 per deck
const dealerLimit = 17;                        //most often dealer must hit at 17

const stats = {
    totalScore: 0,
    totalRounds: 0,
    butcherWon21: 0,
    dealerWon21: 0,
    butcherHasMore: 0,
    dealerHasMore: 0,
    butcherOver: 0,
    dealerOver:0,
    dealerWonByEqual: 0,
    cardsPlayedButcher: 1,
    cardsPlayedDealer: 0
};

const butcher = {
    w:new threads.Worker("./BJplayerButcher.js"),
    score: 0,                                       // for future use
    options:  {c: true, e: 13, p: 0.6}              // see below
};

let numberOfDecks = 10;
let deckValue = 296;
let deck = addNewDeck([]);

/*      Commands to player:
'n' - new round   (no body)
'c' - card is dealt {card}
'i' - init options  {   name,
                        c: countCards, 
                        e: playerEdge,             <---------
                        p: probabilityEdge}
'd' - dropping a hand {name, hand: [array of cards]}
'a' - add a deck   (no body)
                                        
*/
butcher.w.postMessage({cmd: 'i', body: butcher.options});   //n: numberOfDecks,   //  
butcher.w.postMessage({cmd: 'c', body: deck.pop()});

butcher.w.on("message", t =>  {
    console.log('Butcher says:', JSON.stringify(t));
    let mode = t.cmd;

    if (mode === 's') {                             // Stop
        let dealerScore = dealSelf(t.score);  

        if (dealerScore <= 21 && dealerScore >= t.score) {
            mode = 'l';                                         // Player Lost
            if (dealerScore == 21) stats.dealerWon21 ++;
            else if (dealerScore == t.score) stats.dealerWonByEqual ++;
            else stats.dealerHasMore ++;
        } else {
            mode = 'w';                                         // Player Won
            if (dealerScore > 21) stats.dealerOver ++;
            else stats.butcherHasMore ++;
        }  
    }

    if (mode === 'l') {                                 // Player Lost
        stats.totalScore++;
        console.log ('Dealer won!',  `Total score ${stats.totalScore}`);
        if (t.score > 21) stats.butcherOver ++;
    }

    if (mode === 'w') {                                 // Player Won
        stats.totalScore--;
        console.log ('Player won!',  `Total score ${stats.totalScore}`);
        if (t.score >= 21) stats.butcherWon21 ++;
    }

    if (['l', 'w'].includes(mode)) {                      // Round finished
        deckValue -= t.score;
        stats.totalRounds ++;

        checkDeck(21);
                
        butcher.w.postMessage({cmd: 'n'});        
        mode = 'm';    
    }

    if (mode === 'm') {                                     // 1 More card
        stats.cardsPlayedButcher ++;
        butcher.w.postMessage({cmd: 'c', body: deck.pop()});
    }  
});

console.log('-----');


//-----------------------------
function dealSelf(offset) {
    let score = 0;
    let card = {};
    const hand = [];

    checkDeck(dealerLimit + offset + 1);            // 

    while (score <= dealerLimit) {
        card = deck.pop();
        hand.push(card);        
        score += card.val;
        console.log(`Dealer's got ${card.name} of ${card.suit}; total ${score}`);
    }
    stats.cardsPlayedDealer += hand.length;
    butcher.w.postMessage({cmd: 'd', body: {name: 'Dealer', hand: hand}});

    deckValue -= score;
    if (hand.length == 2 && score == 22) return 21;   // 2 aces
    return score;
}

//------------------------
function printStat() {
    console.log ('------------'); 
    console.log (JSON.stringify(stats));
    process.exit(20);
}

//------------------------------------------------
function addNewDeck(deck) {
    const newDeck = [];
    for (let s of suits) {
        for (let n of names) {
            let card = {};
            card.suit = s;
            card.name = n;
            card.val = vals[names.indexOf(n)];        
            let pos = Math.floor(52*Math.random());
            while (newDeck[pos]) {
                pos = (pos+1) % 52;
            }
            newDeck[pos] = card;        
        }
    }
    return newDeck.concat(deck);
}

//--------------------------------------------------------
function checkDeck(edge) {
    if (deckValue < edge) {  
        if (numberOfDecks > 1) {
            deck = addNewDeck(deck);
            deckValue += 296;
            numberOfDecks --;
            console.log ('Deck added');
            butcher.w.postMessage({cmd: 'a'});
        } else {
            console.log (`Game over! Total score ${stats.totalScore}`);
            butcher.w.terminate();
            printStat();
            
        }
    } 
}
