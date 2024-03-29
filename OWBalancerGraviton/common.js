﻿function array_shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function apply_stats_updater_settings() {
	StatsUpdater.update_edited_fields = Settings.update_edited_fields;
	StatsUpdater.update_sr = Settings.update_sr;
	StatsUpdater.update_class = Settings.update_class;
	StatsUpdater.region = Settings.region;
}

function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
}

function calc_team_sr( players_array, players_slots ) {
	var team_sr = 0;
	if ( is_role_lock_enabled() ) {
		for( let class_name of class_names ) {
			if ( players_slots[class_name] == undefined ) {
				continue;
			}
			for( var i=0; i<players_slots[class_name].length; i++) {
				var player_sr = get_player_sr( players_slots[class_name][i], class_name );
				team_sr += player_sr;
			}
		}
	} else {
		for( var i=0; i<players_array.length; i++) {
			var player_sr = get_player_sr( players_array[i], Settings["sr_calc_method"] );
			team_sr += player_sr;
		}
	}
	
	var team_size = get_team_size();
	team_sr = Math.round(team_sr / team_size );
	
	return team_sr;
}

function create_empty_player() {
	var new_player = {
			id: "",
			display_name: "",
			sr_by_class: {},
			playtime_by_class: {},
			empty: true,
			level: 0,
			classes: [],
			top_heroes: [],
			last_updated: new Date(0),
			private_profile: false,
			mark: false,
			ghost: false,
			downloaded: false,
			games_played: 0,
			games_checkedin: 0,
			strikes: 0,
		};
	
	for( let class_name of class_names ) {
		new_player.sr_by_class[class_name] = 0;
		new_player.playtime_by_class[class_name] = 0;
	}
	
	return new_player;
}

function player_mark_category( player ) {
	var strikes_percent = player.strikes*0.5/3;
	switch (player.strikes) {
		case 0: strikes_percent = 0; break;
		case 1: strikes_percent = 0.1; break;
		case 2: strikes_percent = 0.25; break;
		case 3: strikes_percent = 0.51; break;
	}
	var games_percent = player.games_played/player.games_checkedin + strikes_percent;
	// if(!player.mark && player.classes.length > 1) { // role-one-tricks and people who played the last match have a chance to skip the current match
	if(!player.mark && player.classes.length > 0) {
		return 0;
	} else if(player.games_checkedin == 0) {
		return 1; // this shouldn't happen, but just in case
	} else if (games_percent < 0.7) {
		return 1;
	} else if (games_percent < 0.9) {
		return 2;
	} else if (games_percent <= 1) {
		return 3;
	} else { // striked players go after ghosts
		return 5;
	}
}

function create_random_player( id ) {
	var classes = class_names.slice();
	var top_classes = [];
	top_classes.push( classes.splice( Math.round(Math.random()*(classes.length-1)), 1 )[0] );
	
	// second class
	if( Math.random() > 0.4 ) {
		var new_class = classes[ Math.round(Math.random()*(classes.length-1)) ];
		if ( top_classes.indexOf(new_class) == -1 ) {
			top_classes.push( new_class );
		}
	}
	// third class
	if( Math.random() > 0.8 ) {
		var new_class = classes[ Math.round(Math.random()*(classes.length-1)) ];
		if ( top_classes.indexOf(new_class) == -1 ) {
			top_classes.push( new_class );
		}
	}
	var top_heroes = [];
	var new_player = {
			id: "player"+id+"-"+Math.round(Math.random()*99999),
			display_name: "player "+id,
			sr_by_class: {},
			playtime_by_class: {},
			level: Math.round(Math.random()*2000),
			empty: false,
			classes: top_classes,
			top_heroes: top_heroes,
			last_updated: new Date(0),
			fake_id: true,
			private_profile: false
		};

	// sr by classes
	for( var i=0; i<top_classes.length; i++) {
		new_player.sr_by_class[ top_classes[i] ] = Math.round( randn_bm( 1, 4999, 1) );
		new_player.playtime_by_class[ top_classes[i] ] = Math.round( randn_bm( 1, 30, 1) );
	}
		
	return new_player;
}

function escapeHtml(html){
	var text_node = document.createTextNode(html);
	var p = document.createElement('p');
	p.appendChild(text_node);
	return p.innerHTML;
}

function factorial(num) {
    var rval=1;
    for (var i = 2; i <= num; i++)
        rval = rval * i;
    return rval;
}

function find_player_by_id(player_id) {
	for( var i=0; i<lobby.length; i++) {
		if ( player_id == lobby[i].id) {
			return lobby[i];
		}
	}

	for ( const team of [team1, team2] ) {
		for( var i=0; i<team.length; i++) {
			if ( player_id == team[i].id) {
				return team[i];
			}
		}
	}
	
	for ( let team_slots of [team1_slots, team2_slots] ) {
		for ( let class_name in team_slots ) {
			for( var i=0; i<team_slots[class_name].length; i++) {
				if ( player_id == team_slots[class_name][i].id) {
					return team_slots[class_name][i];
				}
			}
		}
	}
	
	return undefined;
}

function find_team_with_free_slot( player ) {
	// find team with empty slot
	if ( is_role_lock_enabled() ) {
		// 1. try to find empty role slot for player classes
		for ( let class_name of player.classes ) {
			for ( let team_slots of [team1_slots, team2_slots] ) {
				if ( team_slots[class_name].length < Settings.slots_count[class_name] ) {
					return team_slots[class_name];
				}
			}
		}
		
		// 2. try any empty role slot
		for ( let team_slots of [team1_slots, team2_slots] ) {
			for ( let class_name in team_slots ) {
				if ( team_slots[class_name].length < Settings.slots_count[class_name] ) {
					return team_slots[class_name];
				}
			}
		}
	} else {
		for( let team of [team1, team2] ) {
			if ( team.length < get_team_size() ) {
				return team;
			}
		}
	}
	
	return undefined;
}

function format_player_id( id ) {
	return id.trim().replace("#", "-");
}

function format_player_name( id ) {
	return id.slice( 0, id.search("-") );
}

function get_default_settings() {
	var def_settings = {
		//common
		slots_count: {},		
		balancer_alg: "rolelockfallback",
		adjust_sr: false,
		adjust_dps: 110,
		adjust_tank: 100,
		adjust_support: 90,
		separate_otps: true,
		
		// classic balancer
		balance_priority: 50,
		sr_calc_method: "main",
		
		// role lock balancer
		balance_priority_rolelock: 50,

		// both balancers
		balance_vs_variativity_priority: 10,
		
		// stats updating
		region: "eu",
		update_class: true,
		update_sr: true,
		update_edited_fields: false,
		update_picked: true,
		update_picked_maxage: 15,

		data_sreadsheet: "",
	};
	
	for ( let class_name of class_names ) {
		def_settings.slots_count[class_name] = 2;
	}
	
	return def_settings;
}

function get_default_export_options() {
	return {
		format: "image",
		include_sr: true,
		include_classes: true,
	}
}

function get_player_index( player_id, team ) {
	for( var i=0; i<team.length; i++) {
		if ( player_id == team[i].id) {
			return i;
		}
	}
	
	return -1;
}

function get_player_at_index( team_slots, player_index ) {
	var current_index = 0;
	for( let class_name in team_slots ) {
		for ( var i=0; i<team_slots[class_name].length; i++ ) {
			if ( current_index == player_index ) {
				return team_slots[class_name][i];
			}
			current_index++;
		}
	}
	return undefined;
}

function get_player_role( team_slots, player ) {
	for ( let class_name in team_slots ) {
		for( var i=0; i<team_slots[class_name].length; i++) {
			if ( player.id == team_slots[class_name][i].id) {
				return class_name;
			}
		}
	}
	return undefined;
}

// Calculate player SR as single number
// Methods:
// 		'max' 		- maximum SR of all roles
//		'main' 		- SR from main role (first in class array)
//		'average' 	- arithmetic mean of all roles
//		'weighted' 	- weighted arithmetic mean of all roles. Weights are time played by role
//		class name 	- SR for specified class
function get_player_sr( player_struct, method="main" ) {
	if ( class_names.indexOf(method) != -1 ) {
		if ( player_struct.sr_by_class[method] !== undefined ) {
			if ( player_struct.classes.indexOf(method) != -1 ) {
				return player_struct.sr_by_class[method];
			} else {
				return 0;
			}
		} else {
			return 0;
		}
	}
	
	if ( method == "max" ) {
		var max_sr = 0;
		for ( const class_name of player_struct.classes ) {
			if ( is_undefined( player_struct.sr_by_class[class_name], 0 ) > max_sr ) {
				max_sr = is_undefined( player_struct.sr_by_class[class_name], 0 );
			}
		}
		return max_sr;
	} else if ( method == "average" ) {
		if ( player_struct.classes.length == 0 ) {
			return 0;
		}
		var sr = 0;		
		for ( const class_name of player_struct.classes ) {
			sr += is_undefined( player_struct.sr_by_class[class_name], 0 );
		}
		return Math.round( sr / player_struct.classes.length );
	} else if ( method == "weighted" ) {
		if ( player_struct.classes.length == 0 ) {
			return 0;
		}
		var sr = 0;
		var total_time = 0;
		for ( const class_name of player_struct.classes ) {
			var time = player_struct.playtime_by_class[class_name];
			if ( time == undefined ) {
				time = 0;
			}
			total_time += time;
			sr += is_undefined( player_struct.sr_by_class[class_name], 0 ) * time;			
		}
		if (total_time == 0 ) {
			total_time = 1;
		}
		return Math.round( sr / total_time );
	} else { 
		// default is 'main'
		if ( player_struct.classes.length == 0 ) {
			return 0;
		}
		var main_class = player_struct.classes[0];
		if ( player_struct.sr_by_class[main_class] !== undefined ) {
			return player_struct.sr_by_class[main_class];
		} else {
			return 0;
		}
	}
}

function get_rank_name( sr ) {
	for ( const rank_name in ow_ranks ) {
		if ( (sr >= ow_ranks[rank_name].min) && (sr <= ow_ranks[rank_name].max) ) {
			return rank_name;
		}
	}
	return "unranked";
}

function get_scrollbar_width() {
	var outer = document.createElement("div");
	outer.style.visibility = "hidden";
	outer.style.width = "100px";
	outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps

	document.body.appendChild(outer);

	var widthNoScroll = outer.offsetWidth;
	// force scrollbars
	outer.style.overflow = "scroll";

	// add innerdiv
	var inner = document.createElement("div");
	inner.style.width = "100%";
	outer.appendChild(inner);        

	var widthWithScroll = inner.offsetWidth;

	// remove divs
	outer.parentNode.removeChild(outer);

	return widthNoScroll - widthWithScroll;
}

function get_team_name( team_number ) {
	return document.getElementById("team"+team_number+"_name").value;
}

function get_team_size() {
	var team_size = 0;
	for( let class_name in Settings["slots_count"] ) {
		for( var i=0; i<Settings["slots_count"][class_name]; i++) {
			team_size++;
		}
	}
	return team_size;
}

function get_team_player_count( team_slots ) {
	var player_count = 0;
	for( let class_name in team_slots ) {
		player_count += team_slots[class_name].length;
	}
	return player_count;
}

function init_team_slots( team_struct ) {
	for ( let prop_name in team_struct ) {
		delete team_struct[prop_name];
	}
	
	for( let class_name of class_names ) {
		team_struct[class_name] = [];
	}
}

// returns true if val is number or a valid number string
function is_number_string( val ) {
	if( typeof val !== "string" ) {
		return false;
	}
	return (+val === +val);
}

function is_undefined( expr, if_undefined ) {
	if( typeof expr === "undefined" ) {
		return if_undefined;
	} else {
		return expr;
	}
}

function is_role_lock_enabled() {
	return true; //document.getElementById("role_lock_enabled").checked;
}

function print_date( date_value ) {
	if( typeof date_value === "undefined" ) {
		return "-";
	} else if (date_value.getTime() == 0) {
		return "-";
	} else {
		return date_value.toLocaleString();
	}
}

// random number with normal distribution ("bell curve")
// using Box–Muller transform
function randn_bm(min, max, skew=1) {
	var u = 0, v = 0;
	while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
	while(v === 0) v = Math.random();
	let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );

	num = num / 10.0 + 0.5; // Translate to 0 -> 1
	if (num > 1 || num < 0) num = randn_bm(min, max, skew); // resample between 0 and 1 if out of range
	num = Math.pow(num, skew); // Skew
	num *= max - min; // Stretch to fill range
	num += min; // offset to min
	return num;
}

function round_to( value, precision ) {
	return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
}

function sort_players( team, sort_field = 'sr', order_asc=false ) {
	// if sorting by checkin sort by something else first
	if (sort_field == 'checkin_name') {
		sort_players( team, 'display_name', order_asc );
		sort_field = 'checkin';
		order_asc = false;
	} else if (sort_field == 'checkin_date') {
		sort_players( team, 'display_name', false );
		sort_players( team, 'last_updated', order_asc );
		sort_field = 'checkin';
		order_asc = false;
	} else if (sort_field == 'checkout_date') {
		sort_players( team, 'display_name', false );
		sort_players( team, 'last_updated', order_asc );
		sort_field = 'checkin';
		order_asc = true;
	}

	// sort_players
	var order = 1;
	if (order_asc) {
		order = -1;
	}
	
	if ( sort_field == 'class' ) {
		team.sort( function(player1, player2){
				var val1 = 0;
				for ( var i=0; i<player1.classes.length; i++ ) {
					var weight = class_names.length - i - 1;
					val1 += (class_names.indexOf( player1.classes[i] )+1) * Math.pow(10, weight);
				}
				
				var val2 = 0;
				for ( var i=0; i<player2.classes.length; i++ ) {
					var weight = class_names.length - i - 1;
					val2 += (class_names.indexOf( player2.classes[i] )+1) * Math.pow(10, weight);
				}

				return order * (val1 - val2);
			} );
	} else if ( sort_field == 'sr' ) {
		team.sort( function(player1, player2){
				var val1 = get_player_sr( player1, Settings["sr_calc_method"] );
				var val2 = get_player_sr( player2, Settings["sr_calc_method"] );
				return order *(val2 - val1);
			} );
	} else if ( sort_field == 'checkin' ) {
		team.sort( function(player1, player2){
				var val1 = checkin_list.has(player1.id) ;
				var val2 = checkin_list.has(player2.id) ;
				return order * (val2 - val1);
			} );
	} else {
		team.sort( function(player1, player2){
				if( typeof player1[sort_field] === 'string') {
					var val1 = player1[sort_field].toLowerCase();
					var val2 = player2[sort_field].toLowerCase();
					return order * ( val1<val2 ? -1 : (val1>val2?1:0) );
				} else { 
					return order * (player2[sort_field] - player1[sort_field]);
				} 
			} );
	}
}

function adjust_players_ranks( teamW, teamL, is_a_draw = false ) {
	if ( is_role_lock_enabled() ) {
		// // check if there are all 12 players EDIT: looks like this should work for any number of players
		// var i = 0;
		// for(team of [teamW, teamL]) {
		// 	for( class_name of ["tank", "dps", "support"] ) {
		// 		for( player of team[class_name] ) {
		// 			if( player.classes.indexOf(class_name) != -1 && player.sr_by_class[class_name] > 0 ) {
		// 				i++;
		// 			}
		// 		}
		// 	}
		// }
		// if (i<10) { 
		// 	alert('Error: Less than 10 players. SR calculation is impossible.');
		// 	return false;
		// }

		var teamW_sr = calc_team_sr(teamW, teamW);
		var teamL_sr = calc_team_sr(teamL, teamL);
		var sr_diff = teamW_sr - teamL_sr;

		var e = 2/(1+Math.pow(10,sr_diff/830));
		if(is_a_draw) {
			e = 0;
		}
		var sr_adjustW = {};
		var sr_adjustL = {};
		var sr_adjust = sr_adjustW;
		var time = new Date;
		for(team of [teamW, teamL]) {
			for( class_name of ["tank", "dps", "support"] ) {
				sr_adjust[class_name] = [];
				for( player of team[class_name] ) {
					player.last_updated = time;
					player.playtime_by_class[class_name] += 0.25;
					player.downloaded = false;
					let k = Math.max(-35+150*Math.pow(player.playtime_by_class[class_name]*4,-1/4),25);
					let adjust = Math.round(k*e);
					player.sr_by_class[class_name] += adjust;
					sr_adjust[class_name].push(adjust);
				}
			}
			e = -e;
			sr_adjust = sr_adjustL;
		}
		SaveHistoryToTheSpreadsheet(teamW, teamL, sr_adjustW, sr_adjustL);
		mark_players(teamW, teamL);
	}
}

function mark_players() {
	for( i in lobby ) {
		lobby[i].mark = false;
		if(checkin_list.has(lobby[i].id)) {
			lobby[i].games_checkedin++;
			lobby[i].last_updated = new Date();
		}
	}
	if ( is_role_lock_enabled() ) 	{
		for( let team of [team1_slots, team2_slots]) {
			for (class_name in team) {
				for( i in team[class_name] ) {
					team[class_name][i].mark = true;
					team[class_name][i].games_checkedin++;
					team[class_name][i].games_played++;
					team[class_name][i].last_updated = new Date();
				}
			}
		}
	}
}

function unmark_players() {
	for( i in lobby ) {
		lobby[i].mark = false;
	}
	if ( is_role_lock_enabled() ) 	{
		for( let team of  [team1_slots, team2_slots]) {
			for (class_name in team) {
				for( i in team[class_name] ) {
					team[class_name][i].mark = false;
				}
			}
		}
	}
	redraw_teams();
	redraw_lobby();
}

function reset_players_marks() {
	document.body.style.cursor='wait';
	document.getElementById("reset_games_button").style.cursor='wait';
	
	SyncPlayersWithTheSpreadsheet(false); // upload data
	setTimeout( function() { // wait a bit till data is uploaded
		if(confirm("This will reset number of games played record for all users of the spreadsheet. Are you sure?")) {
			for( i in lobby ) {
				if (lobby[i].games_checkedin > 0) {
					lobby[i].mark = false;
					lobby[i].games_checkedin = 0;
					lobby[i].games_played = 0;
					lobby[i].last_updated = new Date();
				}
			}
			if ( is_role_lock_enabled() ) 	{
				for( let team of  [team1_slots, team2_slots]) {
					for (class_name in team) {
						for( i in team[class_name] ) {
							if (team[class_name][i].games_checkedin > 0) {
								team[class_name][i].mark = false;
								team[class_name][i].games_checkedin = 0;
								team[class_name][i].games_played = 0;
								team[class_name][i].last_updated = new Date();
							}
						}
					}
				}
			}
			redraw_teams();
			redraw_lobby();
		}

		document.body.style.cursor='default';
		document.getElementById("reset_games_button").style.cursor='default';
	}, 1000);
}

function checkout_a_player( player_id ) {
	checkin_list.delete(player_id);
	/* var player = find_player_by_id(player_id);
	if( player != undefined) {
		player.games_played = 0;
		player.games_checkedin = 0;
		player.last_updated = new Date();
	} */
}

function str_padding( source_str, length, padding_char=" " ) {
	var result = source_str;
	while ( result.length < length ) {
		result += padding_char;
	}
	return result;
}
