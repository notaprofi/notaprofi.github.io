function handleClientLoad  () {
	gapi.load('client:auth2', initClient);
};
  
function initClient  () {
	gapi.client.init({
	  apiKey: 'AIzaSyCE70xN3kWhpmz3sBJ2jjHwI_apHnX7iwU',
	  clientId: '440681897372-gf0iln31fukopnb6iogrfv5vkee2lp1l.apps.googleusercontent.com',
	  discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
	  scope: "https://www.googleapis.com/auth/spreadsheets"
	}).then(function () {
		//console.log("Client init");
	}, function(error) {
		alert("Client init: " + JSON.stringify(error, null, 2));
	});
};

function ConditionalSignIn() {
	if (typeof(gapi) === 'undefined') {
		return false;
	}
	if (typeof(gapi.auth2) === 'undefined') {
		return false;
	}

	if (Settings["data_sreadsheet"] == "") {
		/*gapi.auth2.getAuthInstance().signOut().then(
			function () { 
				document.getElementById('SingIn_Message').style.display = 'none';
				gapiIsSignedIn = false;
			}, function(error) {
				alert("Client signout: " + JSON.stringify(error, null, 2));
			});*/
		return false;
	}
	if( gapiIsSignedIn ) {
		return true;
	}
	gapi.auth2.getAuthInstance().signIn().then(
		function () { 
			document.getElementById('SingIn_Message').style.display = 'block';
			gapiIsSignedIn = true;
		}, function(error) {
			alert("Client signin: " + JSON.stringify(error, null, 2));
		});
	return true;
}

function GetSpreadsheet() { // making sure we are connected to the spreadsheet
	if( !ConditionalSignIn() ) {
		return false;
	}
	if( !gapiIsSignedIn ) {
		return false;
	}

	var spreadsheetIdHelper = new RegExp("/spreadsheets/d/([a-zA-Z0-9-_]+)").exec(Settings["data_sreadsheet"]);
	if (spreadsheetIdHelper == null || spreadsheetIdHelper.length <= 1) {
		alert('Error: Incorrect spreadsheetId link. Put a correct link into the settings or clear the field.');
		return false;
	}
	return spreadsheetIdHelper[1];
}
	
function SyncPlayersWithTheSpreadsheet() {
	var spreadsheet = GetSpreadsheet();
	if( spreadsheet === false ) {
		return false;
	}

	// making sure we've downloaded all the changes made by other people
	var table_range = 'Players!A2:L'+(lobby.length+12+20+1).toString(); // read 20 extra lines, just in case there are new players
	gapi.client.sheets.spreadsheets.values.get({
		spreadsheetId: spreadsheet,
		range: table_range,
	  }).then( function(response) {

		// converting data to the spreadsheetformat
		var players_here = [];
		var length = 12; // from A column to L column
		for (player of lobby) {
			var p_here = PlayerToSpreadsheet(player);
			players_here.push(p_here);
		}
	
		for ( let team_slots of [team1_slots, team2_slots] ) {
			for ( let class_name in team_slots ) {
				for( var i=0; i<team_slots[class_name].length; i++) {
					var p_here = PlayerToSpreadsheet(team_slots[class_name][i]);
					players_here.push(p_here);
				}
			}
		}
	
		players_here.sort( function(player1, player2){
			return player1[0].localeCompare(player2[0]); // sort by id
		} );

		// comparing local data with the server data
		let is_news_here = false;
		var range = response.result;
		if (typeof(range.values) !== 'undefined' && range.values.length > 0) {
		  for (i = 0; i < range.values.length; i++) {
			var player_on_server = range.values[i];
			if (player_on_server[0] == "") continue; // player.id is void => no player here
			var j = players_here.findIndex( function(p, index, array) {
				return p[0] == player_on_server[0]; // compare id's
			});
			if ( j==-1 ) { // there is a new player on the server
				players_here.push(player_on_server);
				lobby.push( SpreadsheetToPlayer(player_on_server) ); // read new player to lobby
			} else {
				// compare dates
				var date_on_server = new Date(player_on_server[length-1]);
				if( players_here[j][length-1] < date_on_server ) { 
					player_on_server[length-1] = date_on_server;
					players_here[j] = player_on_server;
					UpdatePlayer( SpreadsheetToPlayer(player_on_server) );
				} else if( players_here[j][length-1] > date_on_server ) {
					is_news_here = true;
				}
			}
		  }
		  if(!is_news_here) { // check if there are new players locally
			for (i = 0; i < players_here.length; i++) {
				var player_here = players_here[i];
				var j = range.values.findIndex( function(p, index, array) {
					return p[0] == player_here[0]; // compare id's
				});
				if ( j==-1 ) {
					is_news_here = true;
				}
			}
		  }
		} else {
		  alert('No data was found in the spreadsheet.');
		}

		// putting our changes in
		if(is_news_here) {
			players_here.sort( function(player1, player2) { // sort again, in case there were new players on the server
				return player1[0].localeCompare(player2[0]);
			} );
	
			var body = {
				values: players_here
			};
		  
			gapi.client.sheets.spreadsheets.values.update(
				{
					spreadsheetId: spreadsheet,
					range: 'Players!A2',
					valueInputOption: 'RAW',
					resource: body
				}).then((response) => {
	
				},(response) => {
	
					alert('ErrorWrite: ' + response.result.error.message);
	
				}
			); 
		}
	  }, function(response) {

		alert('ErrorRead: ' + response.result.error.message);

	  }
	);
}

function PlayerToSpreadsheet(player) {
	var p_here = [];
	p_here.push(player.id);
	p_here.push(player.display_name);
	p_here.push(player.sr_by_class["tank"]);
	p_here.push(player.sr_by_class["dps"]);
	p_here.push(player.sr_by_class["support"]);
	p_here.push(player.playtime_by_class["tank"]);
	p_here.push(player.playtime_by_class["dps"]);
	p_here.push(player.playtime_by_class["support"]);
	if ( player.classes.length == 0 ) {
		p_here.push("");
		p_here.push("");
		p_here.push("");
	} else if ( player.classes.length == 1 ) {
		p_here.push(player.classes[0]);
		p_here.push("");
		p_here.push("");
	} else if ( player.classes.length == 2 ) {
		p_here.push(player.classes[0]);
		p_here.push(player.classes[1]);
		p_here.push("");
	} else if ( player.classes.length == 3 ) {
		p_here.push(player.classes[0]);
		p_here.push(player.classes[1]);
		p_here.push(player.classes[2]);
	}
	p_here.push(player.last_updated);

	return p_here;
}

function SpreadsheetToPlayer(p) {
	var player = create_empty_player();
	delete player.empty;
	player.downloaded = true;

	player.id = p[0];
	player.display_name = p[1];
	player.sr_by_class["tank"] = parseInt(p[2]);
	player.sr_by_class["dps"] = parseInt(p[3]);
	player.sr_by_class["support"] = parseInt(p[4]);
	player.playtime_by_class["tank"] = parseFloat(p[5]);
	player.playtime_by_class["dps"] = parseFloat(p[6]);
	player.playtime_by_class["support"] = parseFloat(p[7]);
	if ( p[8] != "" ) {
		player.classes.push(p[8]);
	} 
	if ( p[9] != "" ) {
		player.classes.push(p[9]);
	} 
	if ( p[10] != "" ) {
		player.classes.push(p[10]);
	} 
	player.last_updated = new Date(p[11]);

	return player;
}

function UpdatePlayer(player) {
	  // look in lobby
	var li = lobby.findIndex(function(p, index, array) {
		return p.id == player.id; // compare id's
	});
	if (li >= 0) {
		lobby[li] = player;
		redraw_player(lobby[li]);
		return true;
	}

	  // look in role lock teams
	for ( let team_slots of [team1_slots, team2_slots] ) {
		for ( let class_name in team_slots ) {
			for( var i=0; i<team_slots[class_name].length; i++) {
				if ( team_slots[class_name][i].id == player.id) {
					team_slots[class_name][i] = player;
					redraw_player(team_slots[class_name][i]);
					return true;
				}
			}
		}
	}

		// look in classic teams
    // TODO
}

// !!!!we are assuming 2-2-2 composition
function SaveHistoryToTheSpreadsheet(teamW, teamL, sr_adjustW, sr_adjustL) {
	var spreadsheet = GetSpreadsheet();
	if( spreadsheet === false ) {
		return false;
	}

	// form the array to upload
	var value = [];

	value.push(teamW["tank"][0].last_updated);
	// look in role lock teams
	var sr_adjust = sr_adjustW;
	for ( let team of [teamW, teamL] ) {
		for ( let class_name of ["tank", "dps", "support"] ) {
			for( var i=0; i<team[class_name].length; i++) {
				let player = team[class_name][i];
				value.push(player.id);
				value.push(player.sr_by_class[class_name]-sr_adjust[class_name][i]);
				value.push(sr_adjust[class_name][i]);
			}
		}
		sr_adjust = sr_adjustL;
	}

	var values = [];
	values.push(value);

	gapi.client.sheets.spreadsheets.values.get({
		spreadsheetId: spreadsheet,
		range: 'History!AL2',
	  }).then( function(response) {

		// read number of entries
		var NGames;
		var range = response.result;
		if (typeof(range.values) !== 'undefined' && range.values.length > 0) {
			NGames = parseInt(range.values[0]);
		} else {
			alert('No data was found in the History spreadsheet.');
			return false;
		}

		// write to the history table
		var table_range = 'History!A'+(NGames+4).toString();
		var body = [
			{
				range: 'History!AL2',
				values: [ [(NGames+1).toString()] ]
			},
			{
				range: table_range,
				values: values
			}
		];
		gapi.client.sheets.spreadsheets.values.batchUpdate(
			{
				spreadsheetId: spreadsheet,
				valueInputOption: 'RAW',
				data: body
			}).then((response) => {
				
			},(response) => {

				alert('ErrorWrite History: ' + response.result.error.message);

			}
		); 

		}, function(response) {

			alert('ErrorRead HistoryNGames: ' + response.result.error.message);

		}
	);
}