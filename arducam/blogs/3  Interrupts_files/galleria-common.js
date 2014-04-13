var hash = null;
var g_DM_FULLSCREEN_GALLERY_ID = null;

function dm_download_file()
{
	var data = $('#' + g_DM_FULLSCREEN_GALLERY_ID).data('galleria').getData();
	
	location.href = "?download=yes&file=" + data.big;
}

function dm_warn_fullscreen(id)
{
	dm_set_fullscreen_message("Press \"Esc\" to exit full screen");
	
	location.href="#full-screen";
	
	hash = location.hash;

	setInterval(function()
	{
	    if (location.hash != hash)
	    {
	    	$('#' + g_DM_FULLSCREEN_GALLERY_ID).data('galleria').exitFullscreen();
	    	hash = location.hash;
	    }
	}, 100);
}

function dm_set_fullscreen_message(message)
{
	document.getElementById("dm-warn-full-screen-message").innerHTML = message;
	document.getElementById("dm-warn-full-screen").style.display = "block";
	setTimeout("dm_hide_warn_fullscreen()", 2500);
}

function dm_hide_warn_fullscreen()
{
	document.getElementById("dm-warn-full-screen").style.display = "none";
}

function dm_show_slideshow_play()
{
	dm_set_fullscreen_message("Slideshow started");
}

function dm_show_slideshow_pause()
{
	dm_set_fullscreen_message("Slideshow paused");
}

function dm_set_button_opacity(obj, kind, opacity)
{
	var elems = dm_GetElementsByClassName(obj.parentNode, kind, "a");
	
	for(i = 0; i < elems.length; i++)
	{
		elems[i].opacity = (opacity / 100);
		elems[i].MozOpacity = (opacity / 100);
		elems[i].KhtmlOpacity = (opacity / 100);
		elems[i].filter = "alpha(opacity=" + opacity + ")";
	}
}

function dm_resize_gallerias() 
{
	var dmalbums = dm_GetElementsByClassName(document, "dm-album-galleria-script", "div");

	for(i = 0; i < dmalbums.length; i++)
	{
		dm_galleria_load_album(dmalbums[i]);
	}
}

function dm_galleria_load_album(object)
{
	var parent = object.parentNode;
	var src = object.src;

	parent.removeChild(object);

	var fileref = document.createElement('script');
	fileref.setAttribute("type","text/javascript");
	fileref.setAttribute("src", src);
	fileref.setAttribute("class", "dm-album-galleria-script");

	parent.appendChild(fileref);
}

function dm_galleria_load_script(src)
{
	var fileref = document.createElement('script');
	fileref.setAttribute("type","text/javascript");
	fileref.setAttribute("src", src);

	document.getElementsByTagName("head")[0].appendChild(fileref);
}

function dm_GetElementsByClassName(obj, name, type)
{
	if(document.getElementsByClassName)
	{
		return obj.getElementsByClassName(name);
	}

	else
	{
		var matches = new Array();

		objs = obj.getElementsByTagName(type);

		var index = objs.length;

		while(index)
		{
			temp = objs[--index];
			if(temp.className.indexOf(name) != -1) matches.push(temp);
		}

		return matches;
	}
}