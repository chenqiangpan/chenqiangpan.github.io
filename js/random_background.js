////$(document).ready(function () {

////	function randomColor() {
////		return '#' + Math.random().toString(16).slice(2, 8);
////	};

////	$("#button").on("click", function () {
////		$('body').css('background', randomColor());
////	});
////});

//shorter version:

$(function () {

	function randomColor() {
		return '#' + Math.random().toString(16).slice(2, 8);
	};

	$("#hide_button").

		on("click", function ()

	{
			$('body').css('background', randomColor());
			$('#myDIV').hide("slow");
	}

	);

	$("#show_button").

		on("click", function () {
			$('body').css('background', randomColor());
			$('#myDIV').show("fast");
		}

		);

});