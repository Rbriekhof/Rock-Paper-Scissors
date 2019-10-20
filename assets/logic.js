Requirements:
//Only two users can play at the same time.
//Both players pick either rock, paper or scissors. 


// Initialize Firebase
var firebaseConfig = {
    apiKey: "AIzaSyDXDDSCxEYJoIA7A6WznfmZ0BNN1Y4uYqc",
    authDomain: "rock-paper-scissors-96d3d.firebaseapp.com",
    databaseURL: "https://rock-paper-scissors-96d3d.firebaseio.com",
    projectId: "rock-paper-scissors-96d3d",
    storageBucket: "rock-paper-scissors-96d3d.appspot.com",
    messagingSenderId: "102208187215",
    appId: "1:102208187215:web:2aad5b4bb8da084583733a",
    measurementId: "G-XNPTH9Y5NK"
  };

  firebase.initializeApp(firebaseConfig);
  firebase.analytics();

// database connection references
var database = firebase.database();
var playersRef = database.ref("/players");
var chatRef = database.ref("/chat");
var connectedRef = database.ref(".info/connected");

// global vars to keep track of all player data locally
var playerName,
    player1LoggedIn = false,
    player2LoggedIn = false,
    playerNumber,
    playerObject,
    player1Object = {
        name: "",
        choice: "",
        wins: 0,
        losses: 0
    },
    player2Object = {
        name: "",
        choice: "",
        wins: 0,
        losses: 0
    },
    resetId;

// handle lost connection
connectedRef.on("value", function (snap) {
    if (!snap.val() && playerNumber) {
        database.ref("/players/" + playerNumber).remove();
        playerNumber = null;

        // reset screen
        showLoginScreen();
    }
});

playersRef.on("value", function (snap) {
    // update the player names
    $("#player-1").text(player1Object.name || "Waiting for Player 1");
    $("#player-2").text(player2Object.name || "Waiting for Player 2");

    updatePlayerBox("1", snap.child("1").exists(), snap.child("1").exists() && snap.child("1").val().choice);
    updatePlayerBox("2", snap.child("2").exists(), snap.child("2").exists() && snap.child("2").val().choice);

    // display correct "screen" depending on logged in statuses
    if (player1LoggedIn && player2LoggedIn && !playerNumber) {
        loginPending();
    } else if (playerNumber) {
        showLoggedInScreen();
    } else {
        showLoginScreen();
    }

    if (player1Object.choice && player2Object.choice) {
        rps(player1Object.choice, player2Object.choice);
    }

});


chatRef.on("child_added", function (chatSnap) {
    let chatObj = chatSnap.val();
    let chatText = chatObj.text;
    let chatLogItem = $("<li>").attr("id", chatSnap.key);

    // style the message based on who sent it
    if (chatObj.userId == "system") {
        chatLogItem.addClass("system");
    } else if (chatObj.userId == playerNumber) {
        chatLogItem.addClass("current-user");
    } else {
        chatLogItem.addClass("other-user");
    }

    
    if (chatObj.name) {
        chatText = "<strong>" + chatObj.name + ":</strong> " + chatText;
    }

    chatLogItem.html(chatText);

    $("#chat-log").append(chatLogItem);

   
    $("#chat-log").scrollTop($("#chat-log")[0].scrollHeight);
});


chatRef.on("child_removed", function (chatSnap) {
    $("#" + chatSnap.key).remove();
});


playersRef.on("child_added", function (childSnap) {
    window["player" + childSnap.key + "LoggedIn"] = true;
    window["player" + childSnap.key + "Object"] = childSnap.val();
});


playersRef.on("child_changed", function (childSnap) {
    window["player" + childSnap.key + "Object"] = childSnap.val();

    updateStats();
});

// when player is removed, reset respective playerObject and loggedIn flag
playersRef.on("child_removed", function (childSnap) {
    chatRef.push({
        userId: "system",
        text: childSnap.val().name + " has disconnected"
    });

    window["player" + childSnap.key + "LoggedIn"] = false;
    window["player" + childSnap.key + "Object"] = {
        name: "",
        choice: "",
        wins: 0,
        losses: 0
    };

    // when both players have left, clear the chat
    if (!player1LoggedIn && !player2LoggedIn) {
        chatRef.empty();
    }
});


playersRef.on("value", function (snap) {
    // update the player names
    $("#player-1").text(player1Object.name || "Waiting for Player 1");
    $("#player-2").text(player2Object.name || "Waiting for Player 2");

    updatePlayerBox("1", snap.child("1").exists(), snap.child("1").exists() && snap.child("1").val().choice);
    updatePlayerBox("2", snap.child("2").exists(), snap.child("2").exists() && snap.child("2").val().choice);

    // display correct "screen" depending on logged in statuses
    if (player1LoggedIn && player2LoggedIn && !playerNumber) {
        loginPending();
    } else if (playerNumber) {
        showLoggedInScreen();
    } else {
        showLoginScreen();
    }

    if (player1Object.choice && player2Object.choice) {
        rps(player1Object.choice, player2Object.choice);
    }

});


$("#login").click(function (e) {
    e.preventDefault();

    // check to see which player slot is available
    if (!player1LoggedIn) {
        playerNumber = "1";
        playerObject = player1Object;
    }
    else if (!player2LoggedIn) {
        playerNumber = "2";
        playerObject = player2Object;
    }
    else {
        playerNumber = null;
        playerObject = null;
    }

    // if a slot was found, update it with the new information
    if (playerNumber) {
        playerName = $("#player-name").val().trim();
        playerObject.name = playerName;
        $("#player-name").val("");

        $("#player-name-display").text(playerName);
        $("#player-number").text(playerNumber);

        database.ref("/players/" + playerNumber).set(playerObject);
        database.ref("/players/" + playerNumber).onDisconnect().remove();
    }
});


$(".selection").click(function () {
    // failsafe for if the player isn't logged in
    if (!playerNumber) return;

    playerObject.choice = this.id;
    database.ref("/players/" + playerNumber).set(playerObject);

    $(".p" + playerNumber + "-selections").hide();
    $(".p" + playerNumber + "-selection-reveal").text(this.id).show();
});

// when the send-chat button is clicked, send the message to the database
$("#send-chat").click(function (e) {
    e.preventDefault();

    chatRef.push({
        userId: playerNumber,
        name: playerName,
        text: $("#chat").val().trim()
    });

    $("#chat").val("");
});


/**
 * Compares 2 choices and determines a tie or winner
 * @param {string} p1choice rock, paper, scissors
 * @param {string} p2choice rock, paper, scissors
 */
function rps(p1choice, p2choice) {
    $(".p1-selection-reveal").text(p1choice);
    $(".p2-selection-reveal").text(p2choice);

    showSelections();

    if (p1choice == p2choice) {
        //tie
        $("#feedatabaseack").text("TIE");
    }
    else if ((p1choice == "rock" && p2choice == "scissors") || (p1choice == "paper" && p2choice == "rock") || (p1choice == "scissors" && p2choice == "paper")) {
        // p1 wins
        $("#feedatabaseack").html("<small>" + p1choice + " beats " + p2choice + "</small><br/><br/>" + player1Object.name + " wins!");

        if (playerNumber == "1") {
            playerObject.wins++;
        } else {
            playerObject.losses++;
        }
    } else {
        // p2 wins
        $("#feedatabaseack").html("<small>" + p2choice + " beats " + p1choice + "</small><br/><br/>" + player2Object.name + " wins!");

        if (playerNumber == "2") {
            playerObject.wins++;
        } else {
            playerObject.losses++;
        }
    }

    resetId = setTimeout(reset, 3000);
}

/**
 * Reset the round
 */
function reset() {
    clearTimeout(resetId);

    playerObject.choice = "";

    database.ref("/players/" + playerNumber).set(playerObject);

    $(".selection-reveal").hide();
    $("#feedatabaseack").empty();
}

/**
 * Update stats for both players based off most recently-pulled data
 */
function updateStats() {
    ["1", "2"].forEach(playerNum => {
        var obj = window["player" + playerNum + "Object"];
        $("#p" + playerNum + "-wins").text(obj.wins);
        $("#p" + playerNum + "-losses").text(obj.losses);
    });

    player1LoggedIn ? $(".p1-stats").show() : $(".p1-stats").hide();
    player2LoggedIn ? $(".p2-stats").show() : $(".p2-stats").hide();
}

/**
 * Update the player box state
 * @param {string} playerNum 1 or 2
 * @param {boolean} exists 
 * @param {boolean} choice 
 */
function updatePlayerBox(playerNum, exists, choice) {
    if (exists) {
        if (playerNumber != playerNum) {
            if (choice) {
                $(".p" + playerNum + "-selection-made").show();
                $(".p" + playerNum + "-pending-selection").hide();
            } else {
                $(".p" + playerNum + "-selection-made").hide();
                $(".p" + playerNum + "-pending-selection").show();
            }
        }
    } else {
        $(".p" + playerNum + "-selection-made").hide();
        $(".p" + playerNum + "-pending-selection").hide();
    }
}


function loginPending() {
    $(".pre-connection, .pre-login, .post-login, .selections").hide();
    $(".pending-login").show();
}

function showLoginScreen() {
    $(".pre-connection, .pending-login, .post-login, .selections").hide();
    $(".pre-login").show();
}

function showLoggedInScreen() {
    $(".pre-connection, .pre-login, .pending-login").hide();
    $(".post-login").show();
    if (playerNumber == "1") {
        $(".p1-selections").show();
    } else {
        $(".p1-selections").hide();
    }
    if (playerNumber == "2") {
        $(".p2-selections").show();
    } else {
        $(".p2-selections").hide();
    }
}

function showSelections() {
    $(".selections, .pending-selection, .selection-made").hide();
    $(".selection-reveal").show();
}

