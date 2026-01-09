
/*
function getPicks() {

    $.ajax({
        url: 'generate_picks',
        type: 'POST',
        dataType: 'json',
        success: function(response) {
            if (response.error) {
                console.error(response.error);
            } else {
                $('#npick2').val(response.pick2);
                $('#npick3').val(response.pick3);
                $('#npick4').val(response.pick4);
                $('#npick5').val(response.pick5);
            }
        },
        error: function(xhr, status, error) {
            console.error('AJAX request error:', error);
        }
}
*/

function getPicks() {

	var nothing = 1;

	var json_data = {
       "nothing"		: nothing
    };

   	$.ajax({
	    type    : 'POST',
	    url     : 'generate_picks',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	    console.log('done');
	    console.log(data);
    	$('#npick2').val(data.pick2);
        $('#npick3').val(data.pick3);
        $('#npick4').val(data.pick4);
        $('#npick5').val(data.pick5);
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);
	});

	event.preventDefault();	
}

function loadfNumbers() {

	var date = $("#datef_selected").val();

	var json_data = {
       "date"		: date
    };

   	$.ajax({
	    type    : 'POST',
	    url     : 'procedure_load_fast_numbers_public',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	    console.log('done');
	    console.log(data);
    	$( "#pfNumbers" ).empty();
    	$( "#pfNumbers" ).append( data.answer );
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);
	    //$( "#pNumbers" ).empty();
	    //$( "#pNumbers" ).append( data.answer );
	});

	event.preventDefault();	
}

function loadNumbers() {

	var date = $("#date_selected").val();

	var json_data = {
       "date"		: date
    };

   	$.ajax({
	    type    : 'POST',
	    url     : 'procedure_load_numbers_public',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	    console.log('done');
	    console.log(data);
    	$( "#pNumbers" ).empty();
    	$( "#pNumbers" ).append( data.answer );
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);
	    //$( "#pNumbers" ).empty();
	    //$( "#pNumbers" ).append( data.answer );
	});

	event.preventDefault();	
}

function save_fast_numbers(from){

		var numberID 	= $( "#number_id" ).val();
	 	var pick2 	 	= $( "#npick2" ).val();
	 	var pick3 	 	= $( "#npick3" ).val();
	 	var pick4    	= $( "#npick4" ).val();
	 	var pick5	 	= $( "#npick5" ).val(); 
	 	var drawDate 	= $( "#datepicker-autoClose" ).val();
	 	//var drawTime 	= $( "#ex-search" ).val();
	 	//var drawStatus = $( "#ex-basic" ).val();

	 	var drawTime 	= $( "#cTime" ).val();
	 	var drawStatus = $( "#cStatus" ).val();

		var json_data = {
			 "from"			: from,
	       "numberID"		: numberID,
	       "pick2" 		: pick2,
	       "pick3" 		: pick3,
	       "pick4"			: pick4,
	       "pick5"			: pick5,
	       "drawDate"		: drawDate,
	       "drawTime"		: drawTime,
	       "drawStatus"	: drawStatus
	    };

	   	$.ajax({
		    type    : 'POST',
		    url     : 'procedure_save_fast_numbers',
		    data    : json_data,
		    dataType: 'json'
		})
		.done( function( data ) {
		   console.log('done');
		   console.log(data);
		   $( "#entry_result" ).empty();
	    	$( "#entry_result" ).append( data.msg ); 
	    	if (data.answer == 1) {
		    	$( "#number_id" ).val('');
		    	$( "#npick2" ).val('');
			 	$( "#npick3" ).val('');
			 	$( "#npick4" ).val('');
			 	$( "#npick5" ).val('');
			 	$( "#cTime" ).val('');
			 	$( "#cStatus" ).val('');
			 	$( "#new_numbers" ).empty();
			 	$( "#new_numbers" ).append( data.content );
		 	}
	    	//$( "#reload_numbers" ).load("procedure_show_fast_numbers");
		})
		.fail( function( data ) {
		    console.log('fail');
		    console.log(data);

		});

		event.preventDefault();	

}

function edit_fast_numbers(id){

	$("#saven").hide();
	$("#updaten").show();

	$( "#entry_result" ).empty();
	/*
	$('#ex-search option').prop('selected', function() {
        return this.defaultSelected;
   });

   $('#ex-basic option').prop('selected', function() {
        return this.defaultSelected;
   });
	*/

   var json_data = {
       "number_id"		: id
   };

   	$.ajax({
	    type    : 'POST',
	    url     : 'procedure_show_editable_fast_numbers',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	   console.log('done');
	   console.log(data);
	   $( "#number_id" ).val(data.numberID);
	   $( "#npick2" ).val(data.pick2);
    	$( "#npick3" ).val(data.pick3);
    	$( "#npick4" ).val(data.pick4);
    	$( "#npick5" ).val(data.pick5);
    	$( "#datepicker-autoClose" ).val(data.drawDate);
    	$( "#cTime" ).val(data.drawTime);
		$( "#cStatus" ).val(data.drawStatus);
    	//$( "#ex-search option[value='"+data.drawTime+"']" ).prop('selected','selected'); 
    	//$( "#cTime").html($( "#ex-search option:selected" ).text());
    	//$( "#ex-basic" ).children("option[value='"+data.drawStatus+"']").prop('selected','selected'); 
    	//$( "#cStatus").html($( "#ex-basic option:selected" ).text());
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);

	});

	event.preventDefault();	

}

function setNameOptionSelected(from) {

	if (from == 1) {
		lotteryName   = $("#ex-searchx option:selected").text();
	}

	if (from == 2) {
		lotteryName   = $("#ex-searchy option:selected").text();
	}

	$('#lotteryName').html(lotteryName);

}

function save_results(from){

	var resultID 		= $( "#result_id" ).val();
 	var pick3 	 		= $( "#npick3" ).val();
 	var pick4    		= $( "#npick4" ).val();
 	var lotteryDate 	= $( "#datepicker-autoClose" ).val();
 	//var lotteryID 		= $( "#ex-search" ).val();
 	//var lotteryName   = $("#ex-search option:selected").text();

 	var lotteryID 		= $( "#clotteryID" ).val();

	var json_data = {
		 "from"			: from,
       "resultID"		: resultID,
       "pick3" 		: pick3,
       "pick4"			: pick4,
       "lotteryDate"	: lotteryDate,
       "lotteryID"	: lotteryID
    };

   	$.ajax({
	    type    : 'POST',
	    url     : 'procedure_save_results',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	   console.log('done');
	   console.log(data);
	   $( "#entry_result" ).empty();
    	$( "#entry_result" ).append( data.msg );

    	if (data.answer == 1) {
	    	$( "#number_id" ).val('');
		 	$( "#npick3" ).val('');
		 	$( "#npick4" ).val('');
		 	$( "#clotteryID" ).val('');
		 	$( "#lotteryName" ).empty();
		 	$( "#new_numbers" ).empty();
		 	$( "#new_numbers" ).append( data.content );
	 	}

    	//$( "#reload_results" ).load("procedure_show_lotteries_results");
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);

	});

}

function edit_results(id){

	$("#saven").hide();
	$("#updaten").show();

	$( "#entry_result" ).empty();
	/*
	$('#ex-search option').prop('selected', function() {
        return this.defaultSelected;
   });

   $('#ex-basic option').prop('selected', function() {
        return this.defaultSelected;
   });
   */

   var json_data = {
       "result_id"		: id
   };

   	$.ajax({
	    type    : 'POST',
	    url     : 'procedure_show_editable_results',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	   console.log('done');
	   console.log(data);
	   $( "#result_id" ).val(data.resultID);
    	$( "#npick3" ).val(data.pick3);
    	$( "#npick4" ).val(data.pick4);
    	$( "#clotteryID" ).val(data.lotteryID);
    	$( "#lotteryName" ).html(data.lotteryName);
    	$( "#datepicker-autoClose" ).val(data.lotteryDate);
    	//$( "#ex-search option[value='"+data.lotteryID+"']" ).prop('selected','selected'); 
    	//$( "#cTime").html($( "#ex-search option:selected" ).text());
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);

	});

	//event.preventDefault();	

}


function save_numbers(from){

	var numberID 	= $( "#number_id" ).val();
 	var pick3 	 	= $( "#npick3" ).val();
 	var pick4    	= $( "#npick4" ).val();
 	var pick5	 	= $( "#npick5" ).val(); 
 	var drawDate 	= $( "#datepicker-autoClose" ).val();
 	//var drawTime 	= $( "#ex-search" ).val();
 	//var drawStatus = $( "#ex-basic" ).val();

 	var drawTime 	= $( "#cTime" ).val();
	var drawStatus = $( "#cStatus" ).val();

	var json_data = {
		 "from"			: from,
       "numberID"		: numberID,
       "pick3" 		: pick3,
       "pick4"			: pick4,
       "pick5"			: pick5,
       "drawDate"		: drawDate,
       "drawTime"		: drawTime,
       "drawStatus"	: drawStatus
    };

   	$.ajax({
	    type    : 'POST',
	    url     : 'procedure_save_numbers',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	   console.log('done');
	   console.log(data);
	   $( "#entry_result" ).empty();
    	$( "#entry_result" ).append( data.msg );
    	
    	if (data.answer == 1) {
	    	$( "#number_id" ).val('');
		 	$( "#npick3" ).val('');
		 	$( "#npick4" ).val('');
		 	$( "#npick5" ).val('');
		 	$( "#cTime" ).val('');
		 	$( "#cStatus" ).val('');
		 	$( "#new_numbers" ).empty();
		 	$( "#new_numbers" ).append( data.content );
	 	}
    	//$( "#reload_numbers" ).load("procedure_show_numbers");
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);

	});

}


function edit_numbers(id){

	$("#saven").hide();
	$("#updaten").show();

	$( "#entry_result" ).empty();

	/*
	$('#ex-search option').prop('selected', function() {
        return this.defaultSelected;
   });

   $('#ex-basic option').prop('selected', function() {
        return this.defaultSelected;
   });
   */

   var json_data = {
       "number_id"		: id
   };

   	$.ajax({
	    type    : 'POST',
	    url     : 'procedure_show_editable_numbers',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	   console.log('done');
	   console.log(data);
	   $( "#number_id" ).val(data.numberID);
    	$( "#npick3" ).val(data.pick3);
    	$( "#npick4" ).val(data.pick4);
    	$( "#npick5" ).val(data.pick5);
    	$( "#datepicker-autoClose" ).val(data.drawDate);
    	$( "#cTime" ).val(data.drawTime);
		$( "#cStatus" ).val(data.drawStatus);
    	//$( "#ex-search option[value='"+data.drawTime+"']" ).prop('selected','selected'); 
    	//$( "#cTime").html($( "#ex-search option:selected" ).text());
    	//$( "#ex-basic" ).children("option[value='"+data.drawStatus+"']").prop('selected','selected'); 
    	//$( "#cStatus").html($( "#ex-basic option:selected" ).text());
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);

	});

	event.preventDefault();	

}


function show_fields(id){

    var json_data = {
       "info"		: id
    };

   	$.ajax({
	    type    : 'POST',
	    url     : 'show_fields',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	    console.log('done');
	    console.log(data);
    	$( "#fields_content" ).empty();
    	$( "#fields_content" ).append( data.answer );
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);
	    $( "#fields_content" ).empty();
	    $( "#fields_content" ).append( data.answer );
	});

	event.preventDefault();	

}


function create_category(){

	var name  			 =  $( '#name' ).val();
    var description 	 =  $( '#description' ).val();

 
    var json_data = {
       "name"				: name,
       "description" 		: description,

    };

    //Sanity 
    json_data = JSON.stringify(json_data);
    json_data = json_data.replace(/'/g,"''");
    json_data = JSON.parse(json_data);
    //Sanity

   	$.ajax({
	    type    : 'POST',
	    url     : 'procedure_create_category',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	    console.log('done');
	    console.log(data);
    	$( "#entry_result" ).empty();
    	$( "#entry_result" ).append( data.answer );
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);
	    $( "#entry_result" ).empty();
	    $( "#entry_result" ).append( data.answer );
	});

	event.preventDefault();
}

function create_user(){

	var userName  		 =  $( '#userName' ).val();
    var password 		 =  $( '#password' ).val();
    var confirm_password =  $( '#confirm_password' ).val();
    var category_id  	 =  $( '#category_id' ).val();
    var coordinator  	 =  $( '#coordinator_id' ).val();

    var legal_name  	 	=  $( '#legal_name' ).val();
    var legal_id  	 		=  $( '#legal_id' ).val();
    var phone_number_one  	=  $( '#phone_number_one' ).val();
    var phone_number_two  	=  $( '#phone_number_two' ).val();
    var vote_location  	 	=  $( '#vote_location' ).val();
    var user_location  	    =  $( '#user_location' ).val();
    var work_zone  	 		=  $( '#work_zone' ).val();
    var work_zone_building  =  $( '#work_zone_building' ).val();
    var work_zone_address  	=  $( '#work_zone_address' ).val();

    var json_data = {
       "userName"			: userName,
       "password" 			: password,
       "confirm_password" 	: confirm_password,
       "category_id"		: category_id,
       "legal_name"			: legal_name,
       "legal_id"			: legal_id,
       "phone_number_one"	: phone_number_one,
       "phone_number_two"	: phone_number_two,
       "vote_location"		: vote_location,
       "user_location"		: user_location,
       "work_zone"			: work_zone,
       "work_zone_address"	: work_zone_address,
       "work_zone_building"	: work_zone_building,
       "coordinator"		: coordinator

    };

    //Sanity 
    json_data = JSON.stringify(json_data);
    json_data = json_data.replace(/'/g,"''");
    json_data = JSON.parse(json_data);
    //Sanity

   	$.ajax({
	    type    : 'POST',
	    url     : 'procedure_create_user',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	    console.log('done');
	    console.log(data);
    	$( "#entry_result" ).empty();
    	$( "#entry_result" ).append( data.answer );
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);
	    $( "#entry_result" ).empty();
	    $( "#entry_result" ).append( data.answer );
	});

	event.preventDefault();

}

function update_fields() {

	pathname = window.location.pathname;
	pathname = pathname.replace("/", "");

	if (   pathname == 'view_show_coordinators' 
		|| pathname == 'view_show_supporters'
		|| pathname == 'view_show_users'

		) {
		update_user();
	}

}

function update_user(){

	var user_id  		 =  $( '#user_id' ).val();
	var userName  		 =  $( '#userName' ).val();
    var password 		 =  $( '#password' ).val();
    var confirm_password =  $( '#confirm_password' ).val();
    var category_id  	 =  $( '#category_id' ).val();
    var coordinator  	 =  $( '#coordinator_id' ).val();

    var legal_name  	 	=  $( '#legal_name' ).val();
    var legal_id  	 		=  $( '#legal_id' ).val();
    var phone_number  	    =  $( '#phone_number' ).val();
    var vote_location  	 	=  $( '#vote_location' ).val();
    var work_zone  	 		=  $( '#work_zone' ).val();
    var work_zone_building  =  $( '#work_zone_building' ).val();
    var work_zone_address  	=  $( '#work_zone_address' ).val();

    var json_data = {
       "userName"			: userName,
       "password" 			: password,
       "confirm_password" 	: confirm_password,
       "category_id"		: category_id,
       "legal_name"			: legal_name,
       "legal_id"			: legal_id,
       "phone_number"		: phone_number,
       "work_zone"			: work_zone,
       "work_zone_address"	: work_zone_address,
       "work_zone_building"	: work_zone_building,
       "coordinator"		: coordinator,
       "user_id"			: user_id
    };

    //Sanity 
    json_data = JSON.stringify(json_data);
    json_data = json_data.replace(/'/g,"''");
    json_data = JSON.parse(json_data);
    //Sanity

   	$.ajax({
	    type    : 'POST',
	    url     : 'procedure_update_user',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	    console.log('done');
	    console.log(data);
    	$( "#entry_result" ).empty();
    	$( "#entry_result" ).append( data.answer );
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);
	    $( "#entry_result" ).empty();
	    $( "#entry_result" ).append( data.answer );
	});

	event.preventDefault();

}



function logout(){

	var init = 1;

    var json_data = {
       "init"	: init
    };

    //Sanity 
    json_data = JSON.stringify(json_data);
    json_data = json_data.replace(/'/g,"''");
    json_data = JSON.parse(json_data);
    //Sanity

   	$.ajax({
	    type    : 'POST',
	    url     : 'controller_logout',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	    console.log('done');
	    console.log(data);
	    
	    if (data.answer == 1) {
	    	$( "#entry_result" ).empty();
	    	$( "#entry_result" ).append( data.details );
	    } else {
	    	if (data.relative_path == "view_login") {
				$(location).attr('href',data.relative_path);
		    }
	    }
	    
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);
	    $( "#entry_result" ).empty();
	    $( "#entry_result" ).append( data.answer );
	});

	event.preventDefault();

}


function validate_login(){

	var userName  =  $( '#userName' ).val();
    var password  =  $( '#password' ).val();

    var json_data = {
       "userName"	: userName,
       "password" : password
    };

    //Sanity 
    json_data = JSON.stringify(json_data);
    json_data = json_data.replace(/'/g,"''");
    json_data = JSON.parse(json_data);
    //Sanity

   	$.ajax({
	    type    : 'POST',
	    url     : 'controller_validate_login',
	    data    : json_data,
	    dataType: 'json'
	})
	.done( function( data ) {
	    console.log('done');
	    console.log(data);
	    
	    if (data.answer == 1) {
	    	$( "#entry_result" ).empty();
	    	$( "#entry_result" ).append( data.details );
	    } else {
	    	if (data.relative_path == "adminp") {
				$(location).attr('href',data.relative_path);
		    }
	    }
	    
	})
	.fail( function( data ) {
	    console.log('fail');
	    console.log(data);
	    $( "#entry_result" ).empty();
	    $( "#entry_result" ).append( data.answer );
	});

	event.preventDefault();

}

