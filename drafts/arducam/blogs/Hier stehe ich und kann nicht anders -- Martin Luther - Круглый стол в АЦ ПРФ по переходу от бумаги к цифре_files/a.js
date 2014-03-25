/* files in the pack: js/jquery/jquery.lj.inlineCalendar.js, js/jquery/jquery.lj.calendar.js, js/jquery/jquery.mask.js, js/share.js, js/controlstrip.js, js/jquery/jquery.calendarEvents.js, js/jquery/jquery.lj.modal.js, js/jquery/jquery.lj.repostbutton.js, js/s2.js, js/jquery/jquery.lj.confirmbubble.js, js/jquery/jquery.lj.ljcut.js, js/fb-select-image.js, js/template.js, js/userpicselect.js, js/inputcomplete.js, js/datasource.js, js/selectable_table.js, js/quickreply.js, js/md5.js, js/thread_expander.js, js/thread_expander.ex.js, js/commentmanage.js, js/jquery/jquery.lj.journalPromoStrip.js, js/jquery/jquery.vkloader.js, js/ljlive.js, js/lj.api.js */

/* ---------------------------------------------------------------------------------
   file-start: js/jquery/jquery.lj.inlineCalendar.js 
*/

/*!
 * LiveJournal Inline calendar
 *
 * Copyright 2011, dmitry.petrov@sup.com
 *
 * http://docs.jquery.com/UI
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *
 * @overview Inline calendar widget.
 *
 * Widget can be attached to any existant markup.
 *
 * Date wildcards used:
 *  - %D - day ( 01 - 31 )
 *  - %M - month ( 01 - 02 )
 *  - %Y - year ( yyyy, e.g. 2002 )
 *  - %s - unix timestamp in ms
 *
 * Options:
 *  - dayRef: Format of the url that will be attached to each day in the calendar.
 *  - allRefs: Wether to attach links to days in the calendar.
 *    and override currentDate on success.
 *    Could be: true/false/Object {from: Date, to: Date} (all fields are not required)
 *  - activeFrom: Days before this will be inactive in calendar.
 *  - actoveUntil: Days after this willbe inactive incalendar.
 *  - startMonth: Widget will not allow to switch calendar pane to the month before this.
 *  - endMonth: Widget will not allow to switch calendar pane to the month after this.
 *  - startAtSunday: Wether to count sunday as the start of the week.
 *  - events: Object, containing events to show in the calendar. They will be rendered as links. Structure of the object:
 *    { "yyyy": { "mm1" : [ d1, d2, d3, d4 ], "mm2": [ d5, d6, d7 ] } }
 *
 *  Events:
 *  - daySelected: Event is triggered when user selects a day in the calendar. The second parameter passed to the
 *  function is a Date object.
 *  - dateChange Event is triggered when user click on next or prev month/year button.
 *  - currentDateChange: Events is triggered when a new date is set in calendar as current.
 *
 *  Consistent options ( setting these options is guaranteed to work correctly ):
 *  - currentDate, date - Set/get current date.
 *  - activeFrom, date - Set/get earliest active date.
 *  - activeUntil, date - Set/get last active date.
 *  - title, title - set calendar title.
 *  - events, obj - override current events object
 *
 *  @TODO: move all service functions to the widget object and merge it with the view.
 *
 */

(function( $, window ) {

	var defaultOptions = {
		dayRef: '/%Y/%M/%D',
		monthRef: '', //the same, but for the months and year. Calendar will render link, if options are set
		yearRef: '',
		allRefs: false,
		currentDate: new Date(),
		//allow user to select dates in this range
		activeUntil: null,
		activeFrom: null,
		//allow user to switch months between these dates
		startMonth: new Date( 1900, 0, 1 ),
		endMonth: new Date( 2050, 0, 1 ),
		startAtSunday: !(LiveJournal.getLocalizedStr('date.format.offset') !== '0') || false,
		dateFormat: "%Y-%M-%D",
		defaultTitle: "Calendar",
		longMonth: false,

		events: null, //object with events to show in the calendar
		displayedMonth: null, //month displayed on the calendar. If not specified at
								//startup currentDate is used instead.
		dateChange: null,

		selectors: {
			table: 'table',
			title: 'h5',
			tbody: 'tbody',

			month: '.cal-nav-month',
			year:  '.cal-nav-year',
			monthSelect: '.cal-nav-month-select',
			yearSelect:  '.cal-nav-year-select',

			prevMonth: '.cal-nav-month .cal-nav-prev',
			nextMonth: '.cal-nav-month .cal-nav-next',
			prevYear:  '.cal-nav-year .cal-nav-prev',
			nextYear:  '.cal-nav-year .cal-nav-next',

			monthLabel: '.cal-nav-month .cal-month',
			yearLabel: '.cal-nav-year .cal-year'
		},

		classNames: {
			container: '',
			inactive : 'other',
			future : 'other',
			current  : 'current',
			weekend: 'weekend',
			nextDisabled : 'cal-nav-next-dis',
			prevDisabled : 'cal-nav-prev-dis',
			cellHover : 'hover',
			longMonth: 'sidebar-cal-longmonth'
		},

		//now, all lang variables are collected from Site.ml_text and should not be modified
		mlPrefix: {
			monthNamesShort: ['monthNames', 'date.month.{name}.short'],
			monthNamesLong: ['monthNames', 'date.month.{name}.long'],
			dayNamesShort: ['dayNames', 'date.day.{name}.short']
		},

		ml: {
			monthNames: [ "january", "february", "march", "april", "may", "june", "july",
							 "august", "september", "october", "november", "december"],
			dayNames: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
			caption: "Calendar"
		}
	};

	function getDateNumber( d, dropDays ) {
		dropDays = dropDays || false;
		var day = d.getDate().toString();
		if( day.length === 1 ) { day = "0" + day; }
		if( dropDays ) {
			day = "";
		}

		var month = d.getMonth().toString();
		if( month.length === 1 ) { month = "0" + month; }

		return parseInt( d.getFullYear().toString() + month + day, 10);
	}

	function insideTimeRange( range, iDate ) {
		return getDateNumber( iDate, true ) >= getDateNumber( range[0], true ) &&
				getDateNumber( iDate, true ) <= getDateNumber( range[1], true );
	}

	function View(nodes, styles, o)
	{
		this.initialize = function (date) {
			this.tbody = this.catchTableStructure(date);
		};

		this.modelChanged = function (monthDate, events, switcherStates)
		{
			var monthml = o.longMonth? o.ml.monthNamesLong : o.ml.monthNamesShort;
			//we have a 30% speedup when we temporary remove tbody from dom
			this.tbody.detach();
			this.fillDates(monthDate, events);

			for (var sws in switcherStates) {
				nodes[sws][ (!switcherStates[sws]) ? 'addClass' : 'removeClass']( this.disabledStyle(sws) );
			}

			var monthText = o.monthRef
					? $( '<a>', { href: LJ.Util.Date.format( monthDate, o.monthRef ), text: monthml[ monthDate.getMonth() ] } )
					: monthml[ monthDate.getMonth() ];

			var yearText = o.yearRef
					? $( '<a>', { href: LJ.Util.Date.format( monthDate, o.yearRef ), text: monthDate.getFullYear() } )
					: monthDate.getFullYear();

			nodes.monthLabel.empty().append( monthText );
			nodes.yearLabel.empty().append( yearText );

			this.tbody.appendTo( nodes.table );
		};

		this.catchTableStructure = function(date) {
			var tbody = nodes.tbody[0];
			nodes.daysCells = [];
			nodes.daysSpans = [];

			var row, rowsCount = tbody.rows.length, cell, cellsCount;

			var toAdd = 6 - rowsCount;

			var rowStr = '<tr>';
			for( var i = 0; i < 7; ++i ) { rowStr += '<td><span></span></td>'; }
			rowStr += '</tr>';

			while( toAdd-- > 0 ) {
				//add missing rows if server has rendered not enough markup
				$( rowStr ).hide().appendTo( nodes.tbody );
			}
			rowsCount = 6;
			nodes.lastRow = jQuery( tbody.rows[ tbody.rows.length - 1 ] );
			date = new Date(date);

			for( row = 0; row < rowsCount; ++row ) {
				for( cell = 0, cellsCount = tbody.rows[ row ].cells.length; cell < cellsCount; ++cell ) {
					// take into account span inside td
					var node = jQuery( tbody.rows[ row ].cells[ cell ] ),
						children = node.children(),
						day = children.text().trim();

					if(day) {
						date.setDate(day);
						node.data('isActive', true);
						node.data('day', date);
					}

					nodes.daysCells.push(node);
					nodes.daysSpans.push(children);
				}
			}

			return jQuery( tbody );
		};

		this.fillDates = function (monthDate, events)
		{
			function hasEvents( date ) {
				var year = date.getFullYear(),
					month = date.getMonth(),
					day = date.getDate();

				return( events && events[ year ] && events[ year ][ month ] && events[ year ][ month ][ day ] );
			}

			var d = new Date( monthDate );
			d.setDate( 1 );

			var offset;
			if( o.startAtSunday ) {
				offset = d.getDay();
			} else {
				offset = ( d.getDay() === 0 ? 6 : d.getDay()  - 1 );
			}
			d.setDate( 1 - offset );

			for( var i = 0, l = nodes.daysCells.length; i < l; ++i ) {
				var cell = nodes.daysCells[ i ],
					span = nodes.daysSpans[ i ];

				this.formDayString( d, cell, span, hasEvents( d ), this.isActiveDate( d, monthDate ) );

				d.setDate( d.getDate() + 1 );
			}

			d.setDate( d.getDate() - 1 ); //get the date from the last cell
			//we do not use show and hide methods, because show method sets display: block;
			if( d.getDate() < 7 ) {
				nodes.lastRow.css('display', '');
			} else {
				nodes.lastRow.css('display', 'none');
			}
		};

		this.isActiveDate = function( date, currentMonth ) {
			var isActive = true;

			isActive = ( currentMonth.getFullYear() === date.getFullYear() && currentMonth.getMonth() === date.getMonth() );

			if( isActive && ( o.activeFrom || o.activeUntil ) ) {
				isActive = ( o.activeFrom && getDateNumber( o.activeFrom ) <= getDateNumber( date ) ) ||
					( o.activeUntil && getDateNumber( o.activeUntil ) >= getDateNumber( date ) );
			}

			return isActive;
		};

		this.formDayString = function( d, cell, span, hasEvents, isActive )
		{
			d = new Date( d );
			var oldDay = cell.data( 'day' ),
				oldHasEvents = cell.data( 'hasEvents' ),
				oldIsActive = cell.data( 'isActive' );

			var isCurrentDay = ( getDateNumber( d ) === getDateNumber( o.currentDate ) );

			cell.data( 'day', d );
			cell.data( 'isActive', isActive );
			cell.data( 'hasEvents', hasEvents );

			cell[isCurrentDay ? 'addClass' : 'removeClass']( styles.current );
			cell.removeClass( styles.cellHover );

			if( !isActive ) {
				cell.addClass( styles.inactive );
				span.html(d.getDate());
			} else if( hasEvents || o.allRefs ) {

				var _tmpAllRefs = true;
				if (o.allRefs && typeof o.allRefs === 'object') {
					if (o.allRefs.from && d < o.allRefs.from) {
						_tmpAllRefs = false;
					}

					if (o.allRefs.to && d > o.allRefs.to) {
						_tmpAllRefs = false;
					}
				}

				if (_tmpAllRefs) {
					cell.removeClass( styles.inactive );
					span.html( $( '<a />', {
						html: d.getDate(),
						href: LJ.Util.Date.format( d, o.dayRef )
					}));
				} else {
					cell.removeClass(styles.inactive);
					span.html(d.getDate());
				}

			} else {
				cell.removeClass( styles.inactive );
				span.html(d.getDate());
			}
		};

		this.disabledStyle = function (sws)
		{
			if(sws === 'prevMonth' || sws === 'prevYear') {
				return styles.prevDisabled;
			} else {
				return styles.nextDisabled;
			}
		};
	}

	var Calendar = {
		options: {}, //all options were move to the default options object

		_create: function() {
			this._preInit();
			this._initialize();
			this._postInit();
		},

		_preInit: function() {
			var def = $[ this.namespace ][ this.widgetName ].getDefaults();
			this.options = jQuery.extend( true, {}, def, this.options );
			this._prepareMLVars();
		},

		_prepareMLVars: function() {
			var self = this,
				expandVar = function(prefix, name) {
					return LiveJournal.getLocalizedStr(prefix.supplant({name: name}));
				},
				prefixData;

			for (var prefix in this.options.mlPrefix) {
				if (this.options.mlPrefix.hasOwnProperty(prefix)) {
					prefixData = this.options.mlPrefix[prefix];
					this.options.ml[prefix] = this.options.ml[prefixData[0]].map(expandVar.bind(null, prefixData[1]));
				}
			}
		},

		// @TODO: need to change the structure of initialization code to remove this method
		_initialize: function() {
			if( !this.options.displayedMonth ) {
				this.options.displayedMonth = new Date( this.options.currentDate );
			}

			this._events = this.options.events;
			this._hideTimer = null;
			this._nodes = this._nodes || { container: this.element, root: this.element };
			this._invalidateTimer = null;
			
			if (this.element.hasClass(this.options.classNames.longMonth)) {
				this.options.longMonth = true;
			}

			this._bindNodes();

			this.options.startMonth.setDate( 1 );

			this._view = new (this._getView())( this._nodes, this.options.classNames, this.options );
			this._view.initialize(this.options.currentDate);

			if( this._nodes.table.hasClass( "monday" ) ) {
				this._setOption( "startAtSunday", false );
			}

			this._nodes.monthSelect.val(this.options.displayedMonth.getMonth());
			this._nodes.yearSelect.val(this.options.displayedMonth.getFullYear());

			this._bindEvents();
		},

		_postInit: function() {
		},

		_getView: function() {
			return View;
		},

		_bindNodes: function() {
			for( var i in this.options.selectors ) {
				if( !( i in this._nodes ) ) {
					this._nodes[ i ] = this._nodes.container.find( this.options.selectors[ i ] );
				}
			}

			var displayedMonth = LJ.Util.Date.parse(this._nodes.table.attr( "data-date"), this.options.dateFormat)
			if(displayedMonth) {
				this.options.displayedMonth = displayedMonth;
			}
		},

		destroy: function() {
			$.Widget.prototype.destroy.apply(this, arguments);
		},

		_bindEvents: function() {
			var self = this;

			var switcherStates = this._getSwitcherStates( this.options.currentDate ),
				switcherMouseDown = function( item ) {
					return function (ev) {
						ev.preventDefault();
						ev.stopPropagation();
						var switcherStates = self._getSwitcherStates( self.options.currentDate );

						if( switcherStates[item] ) {
							self["_" + item]();
						}
					};
				};

			for (var sws in switcherStates) {
				this._nodes[sws].click( switcherMouseDown(sws) );
			}

			this._nodes.monthSelect.change(function(ev) {
				var d = new Date(self.options.currentDate);
				d.setMonth(this.value);
				self._setOption('currentDate', d);
			});

			this._nodes.yearSelect.change(function(ev) {
				var d = new Date(self.options.currentDate);
				d.setFullYear(this.value);
				self._setOption('currentDate', d);
			});

			this._nodes.tbody
				.delegate( 'td', 'click', function( ev ) {
					self._cellSelectedEvent( $( this ), ev );
				} );
		},

		_switchMonth: function ( go ) {
			var event = jQuery.Event( "dateChange" );
			event.moveForward = go > 0;
			event.switchType = Math.abs( go ) === 12 ? "year" : ( Math.abs( go ) === 1 ? "month" : null );

			event.date = new Date(this.options.displayedMonth.getFullYear(), this.options.displayedMonth.getMonth() + go, 1);

			this._nodes.root.trigger( event );
			this._setOption( 'displayedMonth', event.date );
		},

		_prevMonth: function () { this._switchMonth( -1 ); },
		_nextMonth: function () { this._switchMonth( 1 ); },

		_prevYear : function () { this._switchMonth( -12 ); },
		_nextYear : function () { this._switchMonth( 12 ); },

		_cellSelectedEvent: function( cell, ev ) {
			//if cell is inactive or user controls it's behavior we do not pass event to the link
			if( !cell.data('isActive' ) || this._cellSelected( cell.data( 'day' ) ) ) {
				ev.stopPropagation();
				ev.preventDefault();
			}
		},

		/**
		 * @return {Boolean} returns true if user prevents default behaviour
		 */
		_cellSelected: function( date ) {
			var event = jQuery.Event( "daySelected" );
			this._nodes.root.trigger( event, [ date, LJ.Util.Date.format(date, this.options.dateFormat) ] );

			if( !event.isDefaultPrevented() ) {
				this._setOption( 'currentDate', date );
			}

			return !event.isDefaultPrevented();
		},

		_fitDate: function( date ) {
			date = new Date( date );
			var enabledMonthsRange = [ this.options.startMonth, this.options.endMonth ];

			if( !insideTimeRange( enabledMonthsRange, date ) ) {
				if( getDateNumber( date, true ) < getDateNumber( enabledMonthsRange[ 0 ], true ) ) {
					date = new Date( enabledMonthsRange[ 0 ] );
				} else {
					date = new Date( enabledMonthsRange[ 1 ] );
				}
			}

			return date;
		},

		_getSwitcherStates: function () {
			var monthDate = this.options.displayedMonth,
				yearStart = new Date( monthDate.getFullYear(), 0, 1 ),
				yearEnd = new Date( monthDate.getFullYear(), 11, 1 );

			return {
				prevMonth: this._isActivePrev( monthDate ) !== false,
				prevYear: this._isActivePrev( yearStart ) !== false,
				nextMonth: this._isActiveNext( monthDate ) !== false,
				nextYear: this._isActiveNext( yearEnd ) !== false
			};
		},

		_isActiveNext: function( date ) { return this._isActiveDate( date, 1 ); },
		_isActivePrev: function( date ) { return this._isActiveDate( date, -1 ); },
		_isActiveDate: function( date, dir ) {
			var d = new Date( date );
			d.setMonth( d.getMonth() + dir );
			d.setDate( 1 );

			return insideTimeRange( [ this.options.startMonth, this.options.endMonth ], d );
		},

		_invalidateDisplay: function() {
			var self = this;
			clearTimeout( this._invalidateTimer );

			setTimeout( function() {
				self._view.modelChanged( self.options.displayedMonth, self._events, self._getSwitcherStates() );
			}, 50 );
		},

		_setOption: function( name, value ) {
			switch( name ) {
				case 'currentDate':
					this.options.currentDate = this._fitDate( value );

					var event = jQuery.Event("currentDateChange"),
						date = new Date(this.options.currentDate);
					this._nodes.root.trigger( event, [ date, LJ.Util.Date.format(date, this.options.dateFormat) ] );

					this._setOption( 'displayedMonth', value );
					this._invalidateDisplay();
					break;
				case 'activeFrom':
					this.options.activeFrom = new Date( value );
					this._invalidateDisplay();
					break;
				case 'activeUntil':
					this.options.activeUntil = new Date( value );
					this._invalidateDisplay();
					break;
				case 'title':
					this._title = value;
					this._nodes.title.html( value );
					break;
				case 'events':
					this._events = value;
					this._invalidateDisplay();
					break;
				case 'displayedMonth':
					var newDate = this._fitDate( new Date( value ) ),
						isCurrentMonth = getDateNumber(newDate, true) === getDateNumber(this.options.displayedMonth, true);

					if( !isCurrentMonth ) {
						this.options.displayedMonth = this._fitDate( new Date( value ) );
						this._nodes.monthSelect.val(this.options.displayedMonth.getMonth());
						this._nodes.yearSelect.val(this.options.displayedMonth.getFullYear());
						this._invalidateDisplay();
					}

					break;
				case 'startMonth':
					this.options.startMonth = new Date( value );
					this._invalidateDisplay();
					break;
				case 'endMonth':
					this.options.endMonth = new Date( value );
					this._invalidateDisplay();
					break;
				case 'startAtSunday':
					this.options.startAtSunday = !!value;
					break;
			}
		},

		getElement: function( name ) {
			if( name in this._nodes ) {
				return this._nodes[ name ];
			} else {
				return null;
			}
		}

	};

	$.widget('lj.inlineCalendar', Calendar );

	jQuery.extend( $.lj.inlineCalendar, {

		getDefaults: function() {
			return defaultOptions;
		},

		setDefaults: function ( opts ) {
			if( opts ) {
				jQuery.extend( true, defaultOptions, opts );
			}
		}
	} );

} ( jQuery, window ) );



/* file-end: js/jquery/jquery.lj.inlineCalendar.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/jquery/jquery.lj.calendar.js 
*/

/*!
 * LiveJournal Calendar
 *
 * Copyright 2011, dmitry.petrov@sup.com
 *
 * http://docs.jquery.com/UI
 * 
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *	jquery.lj.bubble.js
 *	jquery.lj.inlineCalendar.js
 *
 *  input plugin ( jquery_fn.js )
 *  mask plugin  ( jquery/jquery.mask.js )
 *
 * @overview Calendar widget.
 *
 * Widget can be attached either directly to input or to any other element.
 * If selected element is not input then input element can be set through options.input variable.
 *
 * Date wildcards used:
 *  - %D - day ( 01 - 31 )
 *  - %M - month ( 01 - 02 )
 *  - %Y - year ( yyyy, e.g. 2002 )
 *  - %s - unix timestamp in ms
 *
 * Options:
 *  - dayRef: Format of the url that will be attached to each day in the calendar.
 *  - allRefs: Wether to attach links to days in the calendar.
 *  - currentDate:  initialy selected date. If input is not empty, than widget will try to parse it's contents
 *  and override currentDate on success.
 *  - activeFrom: Days before this will be inactive in calendar.
 *  - actoveUntil: Days after this willbe inactive incalendar.
 *  - startMonth: Widget will not allow to switch calendar pane to the month before this.
 *  - endMonth: Widget will not allow to switch calendar pane to the month after this.
 *  - startAtSunday: Wether to count sunday as the start of the week.
 *  - dateFormat: Format of date string that will be inserted in the input after user selected value.
 *  - showOn: When to display calendat widget ( click, hover, focus )
 *  - hoverDelay: When showOn === 'hover', this option represents the delay in ms after which calendar will be hidden.
 *  - events: Object, containing events to show in the calendar. They will be rendered as links. Structure of the object:
 *    { "yyyy": { "mm1" : [ d1, d2, d3, d4 ], "mm2": [ d5, d6, d7 ] } }
 *
 *  Events:
 *  - daySelected: Event is triggered when user selects a day in the calendar. The second parameter passed to the
 *  function is a Date object.
 *  - dateChange
 *
 *  Consistent options ( setting these options is guaranteed to work correctly ):
 *  - currentDate, date - Set/get current date. Input is also updated on set.
 *  - activeFrom, date - Set/get earliest active date.
 *  - activeUntil, date - Set/get last active date.
 *  - title, title - set calendar title.
 *  - events, obj - override current events object
 *
 *
 */

(function( $, window ) {

	var tmpl;

	var defaultOptions = {
		showOn: 'click',
		closeControl: true,
		showCellHovers: false,

		hoverDelay: 400,
		align: 'center',
		events: null, //object with events to show in the calendar
		displayedMonth: null, //month displayed on the calendar. If not specified at
								//startup currentDate is used instead.
		bubbleClass: false, //whether to add class to the bubble markup

		selectors: {
			tmpl: '.appwidget-calendar .calendar'
		},

		classNames: {
			showCellHovers: 'all-days',
			popup: 'b-bubble-calendar'
		},

		templates: {
			calendar: '<div class="popup-inner calendar" style="display: none;"> \
						<h5>${caption}</h5> \
						<p class="cal-nav"> \
							<span class="cal-nav-month"> \
								<i class="cal-nav-prev"></i> \
								<span class="cal-month"></span> \
								<i class="cal-nav-next cal-nav-next-dis"></i> \
							</span> \
							<span class="cal-nav-year"> \
								<i class="cal-nav-prev cal-nav-prev"></i> \
								<span class="cal-year"></span> \
								<i class="cal-nav-next cal-nav-next-dis"></i> \
							</span> \
						</p> \
						<table cellspacing="0" cellpadding="0"> \
							<thead> \
								<tr> \
									{{each days}} \
										<th class="{{if $index % 7 === weekend1 || $index % 7 === weekend2}} weekend{{/if}}{{if $index === 0}} first{{/if}}{{if $index === days.length - 1}} last{{/if}}">${day}</th> \
									{{/each}} \
								</tr> \
							</thead> \
							<tbody> \
								{{each cells}} \
								{{if $index % 7 === 0}}<tr>{{/if}} \
								<td{{if $index % 7 === weekend1 || $index % 7 === weekend2}} class="weekend"{{/if}}><span></span></td> \
								{{if $index % 7 === 6}}</tr>{{/if}} \
								{{/each}} \
							</tbody> \
						</table></div>'
		}
	};

	var Calendar = {
		options: {}, //all options were move to the default options object

		_initialize: function() {
			if( !tmpl ) {
				tmpl = this._buildDOM();
			}

			this._nodes = { container: tmpl.clone(), root: this.element };

			$.lj.inlineCalendar.prototype._initialize.apply( this );
			this._invalidateDisplay();
		},

		_bindNodes: function() {
			$.lj.inlineCalendar.prototype._bindNodes.apply( this );

			var self = this;

			this._nodes.container
				.bubble( {
					classNames: {
						containerAddClass: this.options.bubbleClass ? this.options.classNames.popup : ''
					},
					target: this._nodes.root,
					align: this.options.align,
					closeControl: this.options.closeControl,
					showOn: this.options.showOn,
					closeOnContentClick: false
				} )
				.bind( 'bubbleshow', function( ev ) {
					self._trigger( 'show' );
				} )
				.bind( 'bubblehide', function( ev ) {
					self._trigger( 'hide' );
				} )
				.addClass( this.options.classNames.container );

			if( this.options.input ) {
				this._nodes.input = this.options.input;
			} else {
				if( this._nodes.root.is( '[type=text]' ) ) {
					this._nodes.input = this._nodes.root;
				} else {
					this._nodes.input = $();
				}
			}

			if (this._nodes.input.mask) {
				this._nodes.input
					.mask( "?dddd-dd-dd", { placeholder: " " } );
			}

			this._nodes.input.input(this._parseInputValue.bind(this));

			var currentDate = LJ.Util.Date.parse(this._nodes.input.val(), this.options.dateFormat)
			if( currentDate ) {
				this.options.currentDate = currentDate;
			}

			if( this.options.showCellHovers ) {
				this._nodes.table.addClass( this.options.classNames.showCellHovers );
			}
		},

		destroy: function() {
			this._nodes.container.bubble( 'destroy' );
			$.lj.inlineCalendar.prototype.destroy.apply( this );
		},

		_buildDOM: function() {
			var days = this.options.ml.dayNamesShort.map(function(el) { return { day: el }; }),
				weekendIdx1 = 0,
				weekendIdx2 = 6,
				makeArray = function(size, val) {
					var res = [];
					while(size--) { res.push(val); }

					return res;
				};

			if (!this.options.startAtSunday) {
				days[7] = days[0];
				days.shift();
				weekendIdx1 = 5;
			}

			var years = [],
				months = [];

			//generating years
			var endYear = this.options.endMonth.getFullYear(),
				startYear = this.options.startMonth.getFullYear();

			while (endYear >= startYear) {
				years.push({ year: endYear--});
			}

			months = this.options.ml.monthNamesLong.map(function(el) { return {month: el}; });

			var tmplOptions = {
				caption: this.options.ml.caption,
				days: days,
				months: months,
				years: years,
							//   vvvvv - rows * days in week
				cells: makeArray(6 * 7, {}),
				weekend1: weekendIdx1,
				weekend2: weekendIdx2
			};

			if (this.options.templates.calendar.indexOf(' ') !== -1) {
				return jQuery.tmpl(this.options.templates.calendar, tmplOptions);
			} else {
				return LJ.UI.template(this.options.templates.calendar, tmplOptions);
			}
		},

		_parseInputValue: function() {
			var newDate = LJ.Util.Date.parse(this._nodes.input.val(), this.options.dateFormat)

			if( newDate ) {
				this._cellSelected( newDate );
			}
		},

		_cellSelectedEvent: function( cell, ev ) {
			var self = this;

			$.lj.inlineCalendar.prototype._cellSelectedEvent.call( this, cell, ev );

			// if all of table cells are active controls (so on click on the cell we change date or something) - hide calendar
			if (self.options.showCellHovers && !!cell.data('isActive') ) {
				self._nodes.container.bubble( 'hide' );
			}

			// if target of click is link - redirect to its url
			if (ev.target.tagName.toLowerCase() == 'a') {
				window.location.href = ev.target.href;
			}
		},

		_invalidateDisplay: function() {
			this._view.modelChanged( this.options.displayedMonth, this._events, this._getSwitcherStates() );
		},

		_setOption: function( name, value ) {
			$.lj.inlineCalendar.prototype._setOption.call( this, name, value );

			switch( name ) {
				case 'currentDate':
					this._nodes.input
						.val(LJ.Util.Date.format(this.options.currentDate, this.options.dateFormat));
					break;
				default:
			}
		}
	};

	$.widget( 'lj.calendar', $.lj.inlineCalendar, Calendar );
	jQuery.extend( $.lj.calendar, {
		getDefaults: function() {
			return jQuery.extend( true, {}, $.lj.inlineCalendar.getDefaults(), defaultOptions );
		},

		setDefaults: function ( opts ) {
			if( opts ) {
				jQuery.extend( defaultOptions, opts );
			}
		}
	} );

} ( jQuery, window ) );


/* file-end: js/jquery/jquery.lj.calendar.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/jquery/jquery.mask.js 
*/

/**
 * @requires  $.caret
 */

(function($) {
	var input = ($.browser.msie ? "paste": "input") + ".mask";
	var iPhone = (window.orientation != undefined);

	$.mask = {
		definitions: {
			"d": "[0-9]",
			"w": "[A-Za-z]",
			"*": "[A-Za-z0-9а-яА-Я]"
		}
	};
	$.fn.extend({
		unmask: function() {
			return this.trigger("unmask");
		},
		mask: function(maskStr, options) {
			if (!maskStr && this.length > 0) {
				var node = $(this[0]);
				var inputCharTests = node.data( "tests" );

				//if mask is not defined, we return current state of buffer
				return $.map( node.data( "buffer" ), function( el , idx ) {
					return inputCharTests[ idx ] ? el : null;
				}).join("");
			}
			options = $.extend({
				placeholder: "_",
				completed: null
			},
			options);
			var maskDefs = $.mask.definitions;
			var inputCharTests = [];
			//if entered text is longer than question mark position, we do not erase it
			var eraseBorderPos = maskStr.length;
			var lastTestIdx = null;
			var maskLen = maskStr.length;

			//here we generate regexp array to test every char of input
			$.each(maskStr.split(""), function(idx, chr) {
				if (chr == "?") {
					maskLen--;
					eraseBorderPos = idx;
				} else {
					if (maskDefs[chr]) {
						inputCharTests.push(new RegExp(maskDefs[chr]));
						if (lastTestIdx == null) {
							lastTestIdx = inputCharTests.length - 1
						}
					} else {
						inputCharTests.push(null)
					}
				}
			});
			return this.each(function() {
				var $input = $(this);

				//bufferArr is an array containing all the chars of input
				var bufferArr = $.map(maskStr.split(""), function(chr, idx) {
					if (chr != "?") {
						return maskDefs[chr] ? options.placeholder: chr;
					}
				});
				var isSpecialChar = false;
				var inputVal = $input.val();
				$input.data("buffer", bufferArr).data("tests", inputCharTests);

				function getNextTestIdx(offsetIdx) {
					while (++offsetIdx <= maskLen && ! inputCharTests[offsetIdx]) {}
					return offsetIdx
				}

				// this function removes char at specified index from buffer and shift
				// all its' contents left while filtering through the mask
				function removeCharFromBuffer(charIdx) {
					while (!inputCharTests[charIdx] && --charIdx >= 0) {}
					for (var idx = charIdx; idx < maskLen; idx++) {
						if (inputCharTests[idx]) {
							bufferArr[idx] = options.placeholder;
							var nextMaskedChrIdx = getNextTestIdx(idx);
							//if next masked char fits into the mask of the current, we shift it left
							//otherwise stop
							if (nextMaskedChrIdx < maskLen && inputCharTests[idx].test(bufferArr[nextMaskedChrIdx])) {
								bufferArr[idx] = bufferArr[nextMaskedChrIdx]
							} else {
								break;
							}
						}
					}
					updateInputVal();
					$input.caret(Math.max(lastTestIdx, charIdx))
				}

				//insert placeholder at selected position and shift chars, that were after it.
				function insertPlaceholder( start ) {
					for (var idx = start, insertChar = options.placeholder; idx < maskLen; idx++) {
						if (inputCharTests[idx]) {
							var testIdx = getNextTestIdx(idx);
							var bufChr = bufferArr[idx];
							bufferArr[idx] = insertChar;
							if (testIdx < maskLen && inputCharTests[testIdx].test(bufChr)) {
								insertChar = bufChr;
							} else {
								break;
							}
						}
					}
				}

				function keyDownHandler(ev) {
					var caretPos = $(this).caret();
					var keyCode = ev.keyCode;
					isSpecialChar = (keyCode < 16 || (keyCode > 16 && keyCode < 32) || (keyCode > 32 && keyCode < 41));
					if ((caretPos.start - caretPos.end) != 0 && (!isSpecialChar || keyCode == 8 || keyCode == 46)) {
						resetBuffer(caretPos.start, caretPos.end);
					}
					if (keyCode == 8 || keyCode == 46 || (iPhone && keyCode == 127)) {
						removeCharFromBuffer(caretPos.start + (keyCode == 46 ? 0: - 1));
						return false;
					} else {
						if (keyCode == 27) {
							$input.val(inputVal);
							$input.caret(0, parseInputValue());
							return false;
						}
					}
				}
				function keyPressHandler(ev) {
					if (isSpecialChar) {
						isSpecialChar = false;
						return (ev.keyCode == 8) ? false: null
					}
					ev = ev || window.event;
					var charCode = ev.charCode || ev.keyCode || ev.which;
					var caretPos = $(this).caret();
					if (ev.ctrlKey || ev.altKey || ev.metaKey) {
						return true;
					} else {
						if ( (charCode >= 32 && charCode <= 125) || charCode > 186 ) {
							var testIdx = getNextTestIdx( caretPos.start - 1 );
							if ( testIdx < maskLen ) {
								var chr = String.fromCharCode(charCode);
								if ( inputCharTests[ testIdx ].test( chr ) ) {
									insertPlaceholder( testIdx );
									bufferArr[ testIdx ] = chr;
									updateInputVal();
									var caretPos = getNextTestIdx( testIdx );
									$( this ).caret( caretPos );
									if( options.completed && caretPos == maskLen ) {
										options.completed.call( $input )
									}
								}
							}
						}
					}
					return false
				}
				//reset masked chars in range with default placeholer
				function resetBuffer(start, end) {
					for (var idx = start; idx < end && idx < maskLen; idx++) {
						if (inputCharTests[idx]) {
							bufferArr[idx] = options.placeholder
						}
					}
				}
				//updates input according latest buffer contents and returns this string
				function updateInputVal() {
					return $input.val(bufferArr.join("")).val()
				}

				/**
				 * @param boolean takeFullInputValue If true, function will not cut off input value
				 *    if it's length is bellow question mark position or greater than the number of characters
				 *    that where input.
				 */
				function parseInputValue( takeFullInputValue ) {
					var inputValue = $input.val();
					var lastEnteredBufIdx = - 1;

					for (var bufIdx = 0, inputChrIdx = 0; bufIdx < maskLen; bufIdx++) {
						if (inputCharTests[bufIdx]) {
							bufferArr[bufIdx] = options.placeholder;
							while (inputChrIdx++ < inputValue.length) {
								var chr = inputValue.charAt(inputChrIdx - 1);
								if (inputCharTests[bufIdx].test(chr)) {
									bufferArr[bufIdx] = chr;
									lastEnteredBufIdx = bufIdx;
									break;
								}
							}
							if (inputChrIdx > inputValue.length) {
								break;
							}
						} else {
							if (bufferArr[bufIdx] == inputValue.charAt(inputChrIdx) && bufIdx != eraseBorderPos) {
								inputChrIdx++;
								lastEnteredBufIdx = bufIdx;
							}
						}
					}

					//if user entered value before the question mark, we clear buffer contents
					if (!takeFullInputValue && lastEnteredBufIdx + 1 < eraseBorderPos) {
						$input.val("");
						resetBuffer(0, maskLen);
					} else {
						if ( takeFullInputValue  || lastEnteredBufIdx + 1 >= eraseBorderPos) {
							updateInputVal();
							if ( !takeFullInputValue ) {
								$input.val($input.val().substring(0, lastEnteredBufIdx + 1))
							}
						}
					}
					return (eraseBorderPos ? bufIdx : lastTestIdx);
				}

				if (!$input.attr("readonly")) {
					$input.one("unmask", function() {
						$input.unbind(".mask").removeData("buffer").removeData("tests")
					}).bind("focus.mask", function() {
						inputVal = $input.val();
						var lastEnteredValIndex = parseInputValue();
						updateInputVal();
						setTimeout(function() {
							if ( lastEnteredValIndex == maskStr.length ) {
								$input.caret( 0, lastEnteredValIndex )
							} else {
								$input.caret( lastEnteredValIndex )
							}
						},
						0)
					}).bind("blur.mask", function() {
						parseInputValue();
						if ($input.val() != inputVal) {
							$input.change();
						}
					}).bind("keydown.mask", keyDownHandler).bind("keypress.mask", keyPressHandler).bind( input , function() {
						setTimeout(function() {
							$input.caret(parseInputValue(true))
						},
						0);
					})
				}
				parseInputValue();
			})
		}
	})
})(jQuery);


/* file-end: js/jquery/jquery.mask.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/share.js 
*/

/**
*
* Livejournal sharing script.
*
* Usage:
*
* .. Somewhere in the head ..
* <script type="text/javascript">
*   //show only three links in popup by default
*   LJShare.init({"ml":{"close":"Close","title":"Share"},"links":["facebook","twitter","email"]})
* </script>
*
* .. Somewhere on the page ..
* <a href="#">share</a>
* <script type="text/javascript">
*   LJShare.link( {
*       "url":"http://community.livejournal.com/news/750.html",
*       "title":"Some title",
*       "description":"Some description",
*       "links": [ "twitter", "vkontakte", "moimir" ] //we want custom buttons there
*   });
* </script>
*
* You can attach single links:
* LJShare.entry( { url: "http://some.url.com/", title: "Post title", description: "Post description" } )
*       .attach( '#link_selector', 'service_name' )
*       .attach( jQuery( '#another_selector' ), 'service_name2' ) //we can pass nodes or jquery collections
*       .link( '#selector', [ "twitter", "vkontakte", "moimir"] ); //also we can attach popup
*
*/

;(function ($) {
    'use strict';

    var imgPrefix = Site.imgprefix,
        LJShare = {};

    function preload( src ) {
        var img = new Image();
        img.src = imgPrefix + src + '?v=1';
    }

    function prepareOptions( opts ) {
        var options = $.extend({ title: '', description: '', url: '' }, opts);

        //we encode strings two times, because they are decoded once on the livejournal endpoint
        options.url = encodeURIComponent( encodeURIComponent( options.url ) );
        options.title = encodeURIComponent( encodeURIComponent( options.title ) );
        options.description = encodeURIComponent( encodeURIComponent( options.description ) );
        return options;
    }

    [ '/popup-cls.gif', '/popup-arr.gif', '/icons/sharethis.gif' ].forEach(preload);

    function pollForWindowClose(w, service, link) {
        if (w.closed) {

            /**
            * Callback will be fired when external sharing popup will be closed
            *      sharing script will poll for this, so expect some delay.
            *
            * @name LJShare#popupClosed
            * @param {String} service The name of service which window was closed.
            * @event
            */
            var event = jQuery.Event('popupClosed', { service: service, shareLink: link });
        } else {
            setTimeout(pollForWindowClose.bind(null, w, service, link), 200);
        }
    }

    var selectors = {
        close: ".i-popup-close",
        links: ".b-sharethis-services a",
        arrow: ".i-popup-arr"
    };

    // four arrow positions availible
    var arrow_opts = {
        className: "i-popup-arr",
        position: {
            tl: "i-popup-arrtl",
            tr: "i-popup-arrtr",
            bl: "i-popup-arrbl",
            br: "i-popup-arrbr"
        }
    };

    var template = {
        //here we take values from global_options.ml object
        start: '<div class="b-sharethis">' +
                    '<div class="b-sharethis-head">{title}</div>' +
                    '<div class="b-sharethis-services">',
        //here we take values from an object made from service object. Availible vars: name, url, title.
        item:           '<span class="b-sharethis-{name}"><a href="{url}" data-service={name}>{title}</a></span>',
        //here we take values from global_options.ml object
        end:        '</div>' +
                '</div>'
    };

    //buildLink takes values passed to the url with link method ( title, post url, description )
    var default_options = {
        ml: {
            close: "Close",
            title: "Share"
        },
        services: {
            livejournal: {
                title: 'LiveJournal', bindLink: 'http://www.livejournal.com/update.bml?repost_type=c&repost={url}', openInTab: true
            },
            facebook: {
                title: 'Facebook', bindLink: 'http://www.facebook.com/sharer.php?u={url}'
            },
            twitter: {
                title: 'Twitter', bindLink: 'http://twitter.com/share?url={url}&text={title}'
            },
            vkontakte: {
                title: 'Vkontakte', bindLink: 'http://vkontakte.ru/share.php?url={url}'
            },
            moimir: {
                title: 'Moi Mir', bindLink: 'http://connect.mail.ru/share?url={url}'
            },
            stumbleupon: {
                title: 'Stumbleupon', bindLink: 'http://www.stumbleupon.com/submit?url={url}', openInTab: true
            },
            digg: {
                title: 'Digg', bindLink: 'http://digg.com/submit?url={url}', openInTab: true
            },
            email: {
                title: 'E-mail', bindLink: 'http://api.addthis.com/oexchange/0.8/forward/email/offer?username=internal&url={url}&title={title}', height: 600
            },
            tumblr: {
                title: 'Tumblr', bindLink: 'http://www.tumblr.com/share?v=3&u={url}'
            },
            odnoklassniki: {
                title: 'Odnoklassniki', bindLink: 'http://www.odnoklassniki.ru/dk?st.cmd=addShare&st.s=1&st._surl={url}'
            }
        },
        //list of links wich will be shown, when user will click on share link. Can be overriden in init and link methods.
        links: [ 'livejournal', 'facebook', 'twitter', 'vkontakte', 'odnoklassniki', 'moimir', 'email', 'digg', 'tumblr', 'stumbleupon' ],
        showOn: 'click'
    };

    var global_options = $.extend( true, {}, default_options );

    // we add messaging system to notify external scripts about popups being closed.

    /**
    * Overrides default options for current page.
    *
    * @param Object opts Options object, may contain the following fields:
    *    ml - translation strings to use;
    *    services - An Object, that contains configuration fields for services links;
    *    links - array of links that will be shown to the user in popup.
    */
    LJShare.init = function( opts ) {
        if( opts ) {
            global_options = $.extend( true, {}, default_options, opts );
            global_options.links = opts.links || global_options.links;
        }
    };

    /**
    * Bind share popup to the latest link found on the page
    *
    * @param Object opts Options object, may contain the following fields:
    *    title, description, url - parameters of the page you want to share;
    *    links - array of links that will be shown to the user in popup.
    * @param String|Node|Jquery collection Node the popup has to be attached to. Default id a:last
    */
    LJShare.link = function ( opts, node ) {
        if( opts && opts.share_uniq_id ) {
            var id = opts.share_uniq_id;
            delete opts.share_uniq_id;
            LJShare.link( opts, $( '#' + id ) );
            return;
        }

        var a = node || $( 'a:last' ),
            linkImg = a.find( 'img' ),
            link = (linkImg.length) ? linkImg : a,
            url = a.attr( 'href' ),
            options = prepareOptions( $.extend( {}, { url: url } , opts ) ),
            dom;

        a.on('click', function (e) { e.preventDefault(); });

        var links = ( opts.links ) ? opts.links : global_options.links;

        function buildDom( initHidden ) {
            var bubbleOptions = null;

            initHidden = initHidden || false;
            var str = [ template.start.supplant(global_options.ml) ],
                serviceName, serviceObj;

            for( var i = 0; i < links.length; ++i ) {
                serviceName = links[i];
                serviceObj = global_options.services[ serviceName ];

                str.push( template.item.supplant({
                    name: serviceName,
                    title: serviceObj.title,
                    url: serviceObj.bindLink.supplant(options)
                } ) );
            }

            str.push(template.end.supplant(global_options.ml));

            bubbleOptions = {
                target: link,
                showOn: options.showOn || global_options.showOn
            };

            if( options.showOn === "hover" ) {
                bubbleOptions.closeControl = false;
            }

            dom = $( str.join( ' ' ) )
                .hide()
                .bubble( bubbleOptions );

            if( !initHidden ) {
                dom
                    .bubble( 'show' );
            }
        }

        function bindControls() {
            dom.find( selectors.links ).click( function( ev ) {
                dom.bubble('hide');
                var service = $( this ).attr( 'data-service' );

                LJShare.openPopupEvent(this, ev, options, service);
            });
        }

        if( options.showOn === "hover" ) {
            if( !dom ) {
                buildDom( true );
                bindControls();
            }
        }

        link.one( 'click', function( ev ) {
            ev.stopPropagation();

            if( !dom ) {
                buildDom();
                bindControls();
            }
        });

        return this;
    };

    /**
     * open popup functionality was exposed to allow the modification of its behavior
     * by external scripts
     */
    LJShare.openPopupEvent = function(el, ev, options, service) {
        var width, height, w;

        if( global_options.services[ service ].openInTab ) {
            if( $.browser.msie ) {
                ev.preventDefault();
                width = $( window ).width();
                height = $( window ).height();
                window.open( el.href, null, 'toolbar=yes,menubar=yes,status=1,location=yes,scrollbars=yes,resizable=yes,width=' + width + ',height=' + height );
            } else {
                //other browsers just open link in new tab
                el.target = "_blank";
            }
        } else {
            ev.preventDefault();
            width = global_options.services[ service ].width || 640;
            height = global_options.services[ service ].height || 480;
            w = window.open(el.href, 'sharer', 'toolbar=0,status=0,width=' + width + ',height=' + height + ',scrollbars=yes,resizable=yes');
            //double encoded url?!
            pollForWindowClose(w, service, decodeURIComponent(decodeURIComponent(options.url)));
        }
    };

    LJShare.entry = function (opts) {
        var defaults = {
            title: '',
            description: '',
            url: ''
        };

        var options = prepareOptions( opts );

        return {
            attach: function( node, service ) {
                var link = jQuery( node ),
                    serviceObj = global_options.services[ service ];

                if ( service in global_options.services ) {
                    link.each( function() {
                        var url = serviceObj.bindLink.supplant(options);
                        if ( service.openInTab ) {
                            this.url = url;
                            this.target = "_blank";
                        } else {
                            $( this ).click( function( ev ) {
                                var width = service.width || 640;
                                var height = service.height || 480;
                                window.open( url, 'sharer', 'toolbar=0,status=0,width=' + width + ',height=' + height + ',scrollbars=yes,resizable=yes');
                                ev.preventDefault();
                            } );
                        }
                    } );
                }

                return this;
            },

            link: function( node, links ) {
                var opts = $.extend( {}, options, links ? { links: links } : null );
                LJShare.link( opts, ( node ) ? jQuery( node ) : null );

                return this;
            }
        };
    };

    window.LJShare = LJShare;
}(jQuery));


/* file-end: js/share.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/controlstrip.js 
*/

;(function ($) {
    'use strict';

    /**
     * Add community filter functionality for control strip
     */
    function addFilterFunctionality() {
        var bubble,
            form,
            input,
            submit;

        // filter is available only for logged in users
        if ( !Site.remoteUser ) {
            return;
        }

        bubble = $('#lj_controlstrip_new .w-cs-filter-inner');

        // exit if filter content is not currently on the page
        if ( bubble.length === 0 ) {
            return;
        }

        form = $('#sortByPoster');
        input = form.find('[name=poster]');
        submit = form.find('[type=image]');

        bubble.bubble({
            target: '#lj_controlstrip_new .w-cs-filter-icon',
            showOn: 'click',
            closeControl: false
        });

        input.input(function () {
            if( this.value.length ) {
                submit.css('opacity', 1)
                    .prop('disabled', false);
            } else {
                submit.css('opacity', 0)
                    .prop('disabled', true);
            }
        });

        form.on('submit', function (e) {
            if( !input.val().length ) {
                e.preventDefault();
            }
        });
    }

    /**
     * Add labled placeholders for the control strip
     */
    function addLabledPlaceholders() {
        $('#lj_controlstrip_new input[placeholder]').labeledPlaceholder();
    }

    $(function () {
        // load control strip if it's not available on document ready
        // Notice: use cases are not clear
        if (!document.getElementById('lj_controlstrip') && !document.getElementById('lj_controlstrip_new')) {
            $.get(LiveJournal.getAjaxUrl('controlstrip'), { user: Site.currentJournal }, function (data) {
                    $(data).appendTo(document.body).ljAddContextualPopup();
                    addFilterFunctionality();
                    addLabledPlaceholders();
                }
            );
        } else {
            addLabledPlaceholders();
            addFilterFunctionality();
        }
    });

}(jQuery));


/* file-end: js/controlstrip.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/jquery/jquery.calendarEvents.js 
*/

( function( $ ) {
	//we think that all such calendars on the page contain the same information
	var ajaxCache = {};

	$.fn.calendarEvents = function( o ) {
		var defaults = {
			calendarType: 'calendar',
			classNames: {
				idle: 'idle'
			},
			fetchOnFirstDisplay: false
		};

		function getCacheKey( year, month ) {
			return "cache_" + year + month;
		}

		function Events( calendarWidget, o ) {
			var widget = this;

			this.calendar = calendarWidget;
			this.events = null;
			this.options = o;

			this._ajaxActive = false;
			this._currentDate;

			var ajaxTimer,
				loadData = function( date, isMonthSwitch ) {
					clearTimeout( ajaxTimer );
					widget._currentDate = getCacheKey( date.getFullYear(), date.getMonth() + 1 );

					ajaxTimer = setTimeout( function() {
						widget.fetchEvents( date.getFullYear(), date.getMonth() + 1, isMonthSwitch );
					}, 200 );
				};
			this.calendar.bind( 'dateChange', function( ev ) {
				var curDate = widget.calendar[ widget.options.calendarType ]( 'option', 'displayedMonth' ),
					isMonthSwitch = Math.abs( 12 * ( ev.date.getFullYear() - curDate.getFullYear() ) + ( ev.date.getMonth() - curDate.getMonth() ) ) === 1;
				loadData( ev.date, isMonthSwitch );
			} );

			if( this.options.fetchOnFirstDisplay ) {
				this.calendar.one( 'calendarshow', function( ev ) {
					loadData( new Date, true );
				} );
			}

		}

		Events.prototype = {
			getEvents: function( year, month, days ) {
				var result = {};
				result[ +year ] = {};
				result[ +year ][ +month -1 ] = days;

				return result;
			},

			/**
			 * Get events from the server end point and update the calendar.
			 *
			 * @param {Number} year
			 * @param {Number} month
			 * @param {Boolean=true} isMonthSwitch Calendar has year and month preloader and it's a flag which preloader to show
			 */
			fetchEvents: function( year, month, isMonthSwitch ) {
				isMonthSwitch = ( arguments.length >= 3 ) ? !!isMonthSwitch : true;
				var widget = this,
					curMonth = this.calendar[ this.options.calendarType ]( 'option', 'displayedMonth' ),
					loaderSpan = this.calendar[ this.options.calendarType ]( 'getElement', ( isMonthSwitch ) ? 'month' : 'year' ),
					idleClass = this.options.classNames.idle,
					timerActive = true,
					checkState = function() {
						if( !widget._ajaxActive && !timerActive ) {
							loaderSpan.removeClass( idleClass );
						}
					}

				this.calendar[ this.options.calendarType ]( 'getElement', 'year' ).removeClass( idleClass );
				this.calendar[ this.options.calendarType ]( 'getElement', 'month' ).removeClass( idleClass );
				loaderSpan.addClass( idleClass );
				this._ajaxActive = true;

				setTimeout( function() {
					timerActive = false;
					checkState();
				}, 500 );

				var cacheKey = getCacheKey( year, month );
					processResults = function( answer ) {
						if( cacheKey !== widget._currentDate ) { return; }

						widget.events = ajaxCache[ cacheKey ];
						// widget.fixBounds();
						widget.calendar[ widget.options.calendarType ]( 'option', 'events',
							widget.getEvents( widget.events.year, widget.events.month, widget.events.days )  );
						widget._ajaxActive = false;

						checkState();
					};

				if( cacheKey in ajaxCache ) {
					processResults( ajaxCache[ cacheKey ] );
				} else {
					$.getJSON( LiveJournal.getAjaxUrl( 'calendar' ), { year: year, month: month }, function( answer ) {
						ajaxCache[ cacheKey ] = answer;
						processResults( answer );
					} );
				}
			}
		}

		return this.each( function() { new Events( $( this ), $.extend( {}, defaults, o ) ) } );
	}
} ) ( jQuery );


/* file-end: js/jquery/jquery.calendarEvents.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/jquery/jquery.lj.modal.js 
*/

/*!
 * LiveJournal Modal
 * use it to open special urls in "modal" windows
 *
 * Copyright 2011, sergey.zhirkov@sup.com
 *
 * http://docs.jquery.com/UI
 * 
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *
 * Usage:
 *  <a class="window-open-control" href="http://someurl.com">open window</a>
 *	<script>
 *		$('a.window-open-control')
 *			.modal()
 *			.modal('publicMethod')
 *			.modal({ many: options })
 *			.modal('option', 'getOptionName')
 *			.modal('option', 'setOptionName', 'setOptionValue');
 *	</script>
 */

(function ($, window) {
	
	var LJModal = {
		
		options: {
			windowParams: {
				width: 800,
				height: 600
			}
		},
		
		_create: function () {
			var ljModal = this;
			
			ljModal._setOptions(ljModal.options);

			ljModal.element
				.bind('click', function (event) {
					event.preventDefault();
					
					window.open(this.href, ljModal.widgetName, ljModal.options.windowParams);
				});
		},
		
		_setOption: function (option, value) {
			this.options[option] = value;
			
			switch (option) {
				case 'windowParams':
					this.options.windowParams = this._serializeParams(value);
				break;
			}
		},

		_serializeParams: function (params) {
			var result = [];
			
			for (var key in params) {
				if (!params.hasOwnProperty(key)) {
					continue;
				}
				
				result.push(key + '=' + params[key]);
			}
			
			return result.join(',');
		}
		
	};
	
	
	$.widget('lj.modal', LJModal);
	
})(jQuery, this);


/* file-end: js/jquery/jquery.lj.modal.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/jquery/jquery.lj.repostbutton.js 
*/

/**
 * @name $.lj.repostbutton
 * @requires $.ui.core, $.ui.widget, $.lj.basicWidget, $.lj.bubble
 * @class Represents repost button
 * @author dmitry.petrov@sup.com (Dmitry Petrov), anazarov@sup.com (Alexander Nazarov)
 */
(function($, window) {
	'use strict';

	/** @lends $.lj.repostbutton.prototype */
	$.widget('lj.repostbutton', $.lj.basicWidget, {
		options: {
			classNames: {
				active: 'repost-button-active',
				inactive: 'repost-button-inactive',
				popupLoad: 'b-reposted-popup-load',
				popupNomore: 'b-reposted-popup-footer-hide',
				repostError: 'repost-error'
			},

			selectors: {
				counterParent: '.lj-button-c',
				button: '.lj-button-b',
				counter: '.lj-like-item-count',
				buttonLink: '.lj-button-link',
				popupContent: '.b-reposted-popup-content',
				popupFooter: '.b-reposted-popup-footer',
				popupMore: '.b-reposted-popup-footer > a'
			},

			templates: {
				popup: 'templates-CleanHtml-reposted'
			},

			url: '',
			reposted: false,
			cost: 0,
			budget: 0,
			paid: false
		},

		_create: function() {
			$.lj.basicWidget.prototype._create.apply(this);

			if (!this.options.url) {
				LJ.console.warn(this.widgetName, ': no url in options, initialization won\'t continue');
			}

			this._journal = LJ.pageVar('currentJournal', true);
			this._count = null;
			this._remote = LJ.pageVar('remoteUser', true);
			this._reposted = this.options.reposted;
			this._el('buttonLink');
			this._href = this.element.find(this._s('button')).data('href');
			this._href = LJ.Util.Journal.parseLink(this._href) || {};

			if (!this._canRepost()) {
				this.element.addClass(this._cl('inactive'));
				this._buttonLink.removeAttr('title');
				this._lock();
			}

			this._popup = null;
			this._popupContent = null;
			this._popupLocked = false;
			this._lastUser = null;
			this._el('counterParent');
			this._el('counter');

			if (!Number(this._counter.html())) { this._hideCounter(); }

			this._bindControls();
		},

		_hideCounter: function () {
			this._counterParent.addClass('empty');
		},

		_showCounter: function () {
			this._counterParent.removeClass('empty');
		},

		_bindControls: function() {
			var repost = this;

			this.element.on('click', this._s('button'), this._onUpdateButton.bind(this));

			this._counterParent.one('click', function(ev) {
				if (!Number(repost._counter.html())) { return; }

				repost._popup = repost._tmpl('popup');
				repost._el('popupFooter', repost._popup);
				repost._popupContent = repost._popup.find(repost._s('popupContent'));

				repost._popup.bubble({
					showOn: 'click',
					align: 'side',
					alwaysShowUnderTarget: true,
					target: repost._counterParent
				})
				.on('bubblehide', function () {
					repost._lastUser = null;
					repost._popupContent.empty();
					repost._popupFooter.removeClass(repost._cl('popupNomore'));
				})
				.on('bubbleshow', function () {
					repost._loadRepostedList();
				})
				.on('click', repost._s('popupMore'), repost._loadRepostedList.bind(repost));

				Function.defer(function() {
					repost._popup.bubble('show');
				});
			});

			$.lj.basicWidget.prototype._bindControls.apply(repost);
		},

		_loadRepostedList: function(ev) {
			var repost = this;

			if (ev) { ev.preventDefault(); }
			if (this._popupLocked) { return; }

			this._popupLocked = true;
			this._popupContent.addClass(this._cl('popupLoad'));

			LJ.Api.call('repost.get_list', { url: this.options.url, last: this._lastUser }, function(answer) {
				repost._popupContent.removeClass(repost._cl('popupLoad'));
				repost._popupLocked = false;
				if (answer.error) {
					repost._handleAnswer(answer);
				} else {
					repost._render(answer.users, answer.nomore, answer.count);
					repost._lastUser = answer.last;
				}
			});
		},

		_render: function(users, nomore, count) {
			var repost = this;

			/* Display users */
			if (users.length > 0) {
				repost._tmpl('popup', {
					content: true,
					dropComma: !!repost._lastUser,
					users: users
				}).appendTo(repost._popupContent);
			}

			this._updateCounter(count);

			/* Hide 'Show More' button */
			if (nomore) {
				repost._popupFooter.addClass(repost._cl('popupNomore'));
			}
		},

		_onUpdateButton: function(ev) {
			if (!this.locked()) {
				this.toggleRepost();
			}
			ev.preventDefault();
		},

		_handleAnswer: function(answer) {
			if (answer.hasOwnProperty('delete')) {
				if (answer.message) {
					this._showMessage(answer.message);
				}

				/* LJSUP-13479: Repost type or cost changed */
				if (this.paid !== !!answer.paid || this.paid && (this.cost !== answer.cost)) {
					this.element.replaceWith(LiveJournal.renderRepostButton(this.options.url, answer));
					return;
				}
			}

			if (answer.error) {
				if (answer.error.message) {
					this._showMessage(answer.error.message);
				}

				if (answer.error.data) {
					// Redraw button completely with new data
					this.element.replaceWith(LiveJournal.renderRepostButton(this.options.url, answer.error.data));
					return;
				}
			} else {
				this._updateButton( !this._reposted );
			}

			if (!answer.hasOwnProperty('count') && answer.hasOwnProperty('delete')) {
				answer.count = this._count - 1;
			}

			this._updateCounter(answer.count);
			this._unlock();
		},

		_showMessage: function (message) {
			var errorBubble = $('<div />', {
				'class': this._cl('repostError'),
				text: message
			})
			.bubble({
				target: this.element,
				align: 'center',
				hide: function () {
					errorBubble.remove();
				}
			})
			.bubble('show');
		},

		_updateButton: function(reposted) {
			this._reposted = reposted;
			this.element.toggleClass(this._cl('active'), this._reposted);
		},

		_updateCounter: function (count) {
			if (typeof count !== 'undefined') {
				this._count = Number(count);
				this._counter.html(this._count);
			}

			if (!Number(this._counter.html())) {
				this._hideCounter();
			} else {
				this._showCounter();
			}
		},

		_canRepost: function () {
			if (LJ.pageVar('preview')) { return false; }
			if (!this._remote) { return false; }
			if (LJ.pageVar('remote_is_identity', true)) { return false; }
			if (this._remote === this._href.journal) { return false; }

			return true;
		},

		toggleRepost: function() {
			var repost = this,
				args = {
					url: this.options.url
				};

			if (!this._canRepost()) { return; }

			if (this._count === null) {
				this._count = parseInt( this._el('counter').html(), 10) || 0;
			}

			this._lock();
			if (this._reposted) {
				LJ.Api.call('repost.delete', args, function (answer) {
					/* LJSUP-12559: Reload page when repost is deleted in remote user's journal */
					if (!answer.error && !answer.reposted && repost._journal === repost._remote && !location.href.match(/\/friends(?:friends|times)?\b/)) {
						location.reload();
					} else {
						repost._handleAnswer(answer);
					}
				});
			} else {
				args.timezone = LJ.Util.Date.timezone();

				if (this.options.paid) {
					args.cost = this.options.cost;
				}

				LJ.Api.call('repost.create', args, this._handleAnswer.bind(this));
			}
		}
	});
}(jQuery, this));



/* file-end: js/jquery/jquery.lj.repostbutton.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/s2.js 
*/

;(function (window, $) {
	"use strict";

	LiveJournal.register_hook('page_load', function() {
		/* Nothing to do if widget was not loaded */
		if (!$.fn.hasOwnProperty('inlineCalendar')) { return; }

		$('.sidebar-cal').inlineCalendar( {
			selectors: {
				month: '.sbar-cal-nav-month',
				year:  '.sbar-cal-nav-year',

				prevMonth: '.sbar-cal-nav-month .sbar-cal-nav-prev',
				nextMonth: '.sbar-cal-nav-month .sbar-cal-nav-next',
				prevYear:  '.sbar-cal-nav-year .sbar-cal-nav-prev',
				nextYear:  '.sbar-cal-nav-year .sbar-cal-nav-next',

				monthLabel: '.sbar-cal-nav-month .sbar-cal-month',
				yearLabel: '.sbar-cal-nav-year .sbar-cal-year'
			},
			classNames: {
				current  : 'today',
				nextDisabled : 'disabled',
				prevDisabled : 'disabled'
			},
			dayRef: Site.currentJournalBase + '/%Y/%M/%D',
			monthRef: Site.currentJournalBase + '/%Y/%M',
			yearRef: Site.currentJournalBase + '/%Y',
			endMonth: new Date(),
			startAtSunday: true
		}).bind('daySelected', function (event) {
			event.preventDefault();
		}).calendarEvents( { calendarType: "inlineCalendar" });
	});

	LiveJournal.register_hook('page_load', function () {
		var className = 'hover',
			tabElements = $('.sidebar dl'),
			tabHeaders = $('.sidebar dt'),
			preventClose = false;

		if ($('.sidebar-friendstimes').length === 0) { return; }

		if (LJ.Support.touch) {
			tabHeaders.on('touchstart', function () {
				$(this).parent()
					.toggleClass(className)
					.siblings()
					.removeClass(className);
			});
			tabElements.on('touchstart', function () {
				preventClose = true;
			});
			$(document).on('touchstart', function () {
				if (preventClose) {
					preventClose = false;
				} else {
					tabElements.removeClass(className);
				}
			});
		} else {
			tabElements.on({
				'mouseenter': function () {
					$(this).addClass('hover');
				},
				'mouseleave': function () {
					$(this).removeClass('hover');
				}
			});
		}
	});

	var urls_cache  = {};

	function removeRepost(url) {
		LJ.Api.call('repost.delete', { url: url }, function(answer) {
			if (answer.error) {
				LiveJournal.ajaxError(answer.error.message);
			} else {
				location.reload();
			}
		});
	}

	function initPopup(node, onconfirm) {
		$(node).confirmbubble({
			confirmText: LJ.ml('repost.confirm.delete'),
			confirm: onconfirm || $.noop
		});
	}

	LiveJournal.register_hook('repost.requestRemove', function(node, url) {
		initPopup(node, removeRepost.bind(null, url));
	});
}(window, jQuery));


/* file-end: js/s2.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/jquery/jquery.lj.confirmbubble.js 
*/

 /**
 * @author dmitry.petrov@sup.com (Dmitry Petrov)
 * @fileoverview LiveJournal confirmbubble widget.
 */

/**
 * @name $.lj.confirmbubble
 * @requires $.ui.core, $.ui.widget, $.lj.basicWidget
 * @class Widget shows confirmation dialog when user click on node
 */
(function($, window) {

	/** @lends $.lj.confirmbubble.prototype */
	$.widget('lj.confirmbubble', $.lj.basicWidget, {
		options: {
			selectors: {
				ok: '.b-popup-btn',
				cancel: '.b-popup-cancel',
				check: '.b-popup-check'
			},

			templates: {
				content: 'templates-Widgets-popupcontent'
			},

			confirm: jQuery.noop,
			confirmText: '',
			yesText: '',
			noText: '',
			checkText: '',
			headerText: '',
			showCheck: false,
			showHeader: false
		},

		_create: function() {
			$.lj.basicWidget.prototype._create.apply(this);

			this._content = this._tmpl('content', {
				confirm_text: this.options.confirmText,
				yes_text: this.options.confirmYes || LJ.ml('confirm.bubble.yes'),
				no_text: this.options.confirmNo || LJ.ml('confirm.bubble.no'),
				show_check: this.options.showCheck,
				show_header: this.options.showHeader,
				header_text: this.options.headerText,
				check_text: this.options.checkText
			});

			this._bindControls();

			this._content.bubble({
				showOn: 'click',
				target: this.element
			});

			if (this.options.showCheck) {
				this._content.find(this._s('ok')).attr('disabled', true);
			}

			//this may be disabled from options later
			Function.defer(this._content.bubble.bind(this._content,'show'));
		},

		_bindControls: function() {
			var bubble  = this,
				content = this._content,
				ok      = content.find(this._s('ok')),
				options = this.options;

			$.lj.basicWidget.prototype._bindControls.apply(this);

			content
				.on('click', this._s('ok'), function(ev) {
					content.bubble('hide');
					options.confirm();
				})
				.on('change', this._s('check'), function(ev) {
					if ($(this).attr('checked')) {
						ok.removeAttr('disabled');
					} else {
						ok.attr('disabled', true);
					}
				})
				.on('click', this._s('cancel'), function(ev) {
					content.bubble('hide');
				})
				.on('bubblehide', function(ev) {
					bubble._trigger('hide');
				})
				.on('bubbleshow', function(ev) {
					bubble._trigger('show');
				});
		},

		show: function() {
			this._content.bubble('show');
		},

		hide: function() {
			this._content.bubble('hide');
		}
	});
})(jQuery, this);


/* file-end: js/jquery/jquery.lj.confirmbubble.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/jquery/jquery.lj.ljcut.js 
*/

/**
 * @author Valeriy Vasin (valeriy.vasin@sup.com)
 * @name $.lj.ljcut
 * @requires $.ui.core, $.ui.widget, $.lj.basicWidget, LJ
 * @class The widget is responsible for expanding cuts
 */
;(function ($) {
	"use strict";

	$.widget('lj.ljcut', $.lj.basicWidget, {
		options: {
			// journal identifier (comes from server)
			journalid: null,
			// post identifier (comes from server)
			ditemid: null,
			// cut identifier inside of the post (comes from server)
			cutid: null,
			// server request param: use placeholders or not (1 or 0). Comes from server
			placeholders: 0,

			selectors: {
				expand: '.ljcut-link-expand',
				collapse: '.ljcut-link-collapse'
			},
			classNames: {
				preloader: 'ljcut-link-expanding',
				expanded: 'ljcut-expanded'
			}
		},

		_create: function () {
			$.lj.basicWidget.prototype._create.apply(this);

			// jQuery element that will contain loaded content of the cut
			this.content = null;
			// test OS for Mac
			this._isMac = (/Mac/).test(navigator.userAgent);
			// $.browser.opera is deprecated
			this._isOpera = (/Opera/.test(navigator.userAgent));

			this._bindControls();
		},

		_bindControls: function () {
			$.lj.basicWidget.prototype._bindControls.apply(this);

			this.element.on('click', this._s('expand'), this._expand.bind(this));
			this.element.on('click', this._s('collapse'), this._collapse.bind(this));
			$(document).on('keydown', this._shortcuts.bind(this));
		},

		/**
		 * Shortcuts handler
		 * @param  {Object} e jQuery event object
		 */
		_shortcuts: function (e) {
			var ctrl = (this._isMac && this._isOpera) ? e.metaKey : e.ctrlKey,
				alt = e.altKey;

			if (!ctrl || !alt) {
				return;
			}

			switch (e.which) {
				// expand: ctrl + alt + "+"
				case 61: // FireFox, IE
					// fall through
				case 187: // Opera, Chrome, Safari
					this.expand();
					break;

				// collapse: ctrl + alt + "-"
				case 173: // FireFox
					// fall through
				case 31: // Opera Mac
					// fall through
				case 109: // Opera Windows
					// fall through
				case 189: // Chrome, Safari
					this.collapse();
					break;

				// no default
			}
			e.preventDefault();
		},

		/**
		 * Show or hide preloader
		 * @param  {Boolean} state Preloader state: True (show) or False (hide)
		 */
		_togglePreloader: function (state) {
			this.element.toggleClass( this._cl('preloader'), state );
		},

		/**
		 * Toggle content state
		 * @param  {Boolean} state State of content: expand (true) or collapse (false)
		 */
		_toggleContent: function (state, callback) {
			var that = this;

			if (this.locked() || !this.content) {
				return;
			}

			this._lock();
			if (typeof callback !== 'function') {
				callback = $.noop;
			}

			that.element.toggleClass( that._cl('expanded'), state );
			if (state) {
				this.content.slideDown('fast', function () {
					that._trigger('show', null, that);
					callback();
					that._unlock();
				});
			} else {
				this.content.slideUp(50, function () {
					that._trigger('hide', null, that);
					callback();
					that._unlock();
				});
			}
		},

		/**
		 * Request server for the cut content
		 * @param  {Object} data Data that is needed for request
		 */
		_requestContent: function (data) {
			var that = this;

			this._lock();
			this._togglePreloader(true);
			LJ.Api.call('event.get_lj_cut', data, function (response) {
				that.content = $('<div />', { html: response.text }).hide();
				that.element.after( that.content );
				that._unlock();
				that._togglePreloader(false);

				// add handlers after content becomes visible
				that._toggleContent(true, that._addHandlers.bind(that));

				// statistic
				if (response.counter_image_url) {
					LJ.Stat.addCounter(response.counter_image_url);
				}
			});
		},

		/**
		 * Provide dynamic behavior for the content (javascript handlers)
		 * @private
		 */
		_addHandlers: function () {
			this.content.ljAddContextualPopup();
			this.content.ljLikes();
		},

		/**
		 * Expand content
		 */
		expand: function () {
			if ( this.locked() ) {
				return;
			}
			if ( this.content ) {
				this._toggleContent(true);
			} else {
				this._requestContent({
					journalid: this.options.journalid,
					ditemid: this.options.ditemid,
					cutid: this.options.cutid,
					placeholders: this.options.placeholders
				});
			}
		},

		/**
		 * Collapse content (for external usage)
		 */
		collapse: function () {
			if ( !this.locked() ) {
				this._toggleContent(false);
			}
		},

		/**
		 * Expand link click handler
		 * @param  {Object} e jQuery event object
		 */
		_expand: function (e) {
			// open link in new tab
			if (e.metaKey || e.ctrlKey) {
				return true;
			}
			e.preventDefault();
			this.expand();
		},

		/**
		 * Collapse link click handler
		 * @param  {Object} e jQuery event object
		 */
		_collapse: function (e) {
			// open link in new tab
			if (e.metaKey || e.ctrlKey) {
				return true;
			}
			e.preventDefault();
			this.collapse();
		}
	});
}(jQuery));

/* file-end: js/jquery/jquery.lj.ljcut.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/fb-select-image.js 
*/

jQuery(function() {
	var fbInput = $('repost_facebook'),
		thumb = $('repost_facebook_thumbnail'),
		selectUpdate = $('select-fb-thumbnail'),
		selectComments = $('select-fb-thumbnail-comments'),
		userPic = $('userpic_preview_image'),
		selectWindow = $('fbimg_select_window'),
		selectNav = $('fbimg_select_window_nav'),
		select = selectUpdate || selectComments;

	var noThumb = "nothumb";
	var userpicVal = "userpic";

	if(select == null) {
		return;
	}

	var options = {};
	if(selectUpdate) {
		options = {
			getText: function() {
				if(window.switchedRteOn){
					return CKEDITOR.instances.draft.getData();
				} else {
					return jQuery('#draft').val();
				}
			},
			getUserPic: function() {
				return (userPic) ? userPic.src : "";
			}
		};
	}
	else {
		options = {
			getText: function() {
				var txtArea = $('commenttext') || $('body');
				return txtArea.value;
			},
			getUserPic: function() {
				var upicSelect = jQuery('#userpics > [name=prop_picture_keyword]');
				if(upicSelect.length == 0) {
					upicSelect = jQuery('#prop_picture_keyword');
				}

				if(upicSelect.length == 0) {
					return "";
				}

				var val = upicSelect.val();

				if(val in userpicmap) {
					return userpicmap[val];
				}

				return defaultpicurl || "";
			}
		};
	}

	var selectPopup = {
		init: function() {
			this.opened = false;
			this.page = 1;
			this.totalImages = 1;
			this.pager = {
				prev: jQuery(selectNav).children('.i-repost-nav-prev'),
				next: jQuery(selectNav).children('.i-repost-nav-next'),
				counter: jQuery(selectNav).children('.i-repost-nav-counter')
			};
			this.listWrapper = jQuery(selectWindow).children('.b-repost-pics-wrapper');
			this.list = this.listWrapper.children('.b-repost-pics-items');
			this.pagerSize = 4;
			this.pagesNum = 1;
			this.cellWidth = 0;

			this.pager.prev.click(function(){ selectPopup.changePage(-1)});
			this.pager.next.click(function(){ selectPopup.changePage(1)});

			this.firstLi = this.list.children('span:first').click(function() {
					selectPopup.setPicture(noThumb);
			});
		},

		setPicture: function(url) {
			thumb.value = url;
			this.close();
		},

		updatePager: function() {
			selectNav.style.display = (this.totalImages < this.pagerSize)?"none":"block";
			this.pager.prev[(this.page == 1)?"addClass":"removeClass"]('i-repost-nav-prev-dis');
			this.pager.next[(this.page == this.pagesNum)?"addClass":"removeClass"]('i-repost-nav-next-dis');

			this.pager.counter.html(this.page + '/' + this.pagesNum);
		},

		makeListItem: function(url, value, selected) {
			var selClass = (selected)?"b-repost-pics-active":"";

			return jQuery('<span>')
				.addClass(selClass)
				.append ( jQuery('<img>').attr('src', url) )
				.click(function () { selectPopup.setPicture(value) });
		},

		open: function(imgList) {
			this.list.children('span:gt(0)').remove();
			this.totalImages = imgList.length;
			this.page = 1;

			if((imgList.length == 0 || jQuery.inArray(thumb.value, imgList) == -1) && thumb.value != userpicVal && thumb.value != noThumb) {
				thumb.value = "";
			}

			var upicurl = options.getUserPic();
			if(upicurl.length > 0) {
				var userPicImg = upicurl;
				this.makeListItem(userPicImg, userpicVal, userpicVal == thumb.value).appendTo(this.list);
				this.totalImages++;
			}
			this.pagesNum = Math.ceil((this.totalImages + 1) / this.pagerSize);

			if(this.totalImages > 1 && thumb.value == "") {
				thumb.value = imgList[0];
			}

			var selected = "",
				currentPageNum = 1;
			for(var i=0; i < imgList.length; ++i) {
				if( imgList[i] == thumb.value ) {
					currentPageNum = Math.floor( (i + 1 + ((upicurl.length > 0)? 1 : 0)) / this.pagerSize ) + 1;
				}
				this.makeListItem(imgList[i], imgList[i], imgList[i] == thumb.value).appendTo(this.list);
			}

			this.firstLi[((this.totalImages <= 1 && thumb.value == "") || thumb.value == noThumb)?"addClass":"removeClass"]("b-repost-pics-active");

			selectWindow.style.display = 'block';
			this.opened = true;

			this.firstLi.each(function() {
				selectPopup.cellWidth = this.offsetWidth + this.offsetLeft; //calc cell width there because it's not visible on init
			});

			var wrapperWidth = (this.pagerSize > this.totalImages) ? (this.cellWidth * (this.totalImages + 1)) + "px" : "";
			this.listWrapper.css('width', wrapperWidth);
			this.changePage(currentPageNum - 1); // default page is number one, subtracting
		},

		changePage: function(num)
		{
			this.page += num;
			this.page = (this.page < 1)? 1:
						((this.page > this.pagesNum) ? this.pagesNum : this.page);

			var offset =  - this.cellWidth * (this.page - 1) * this.pagerSize;
			this.list.css('left', offset + "px");

			this.updatePager();
		},

		close: function() {
			selectWindow.style.display = 'none';
			this.opened = false;
		}
	}

	selectPopup.init();
	selectWindow.onmousedown = function(event) {
		event = event || window.event;
		if (event.stopPropagation) event.stopPropagation(); else event.cancelBubble = true;
	};

	function extractImageUrls(arr, text)
	{
		jQuery('<div>' + text + "</div>").find("img").each(function() {
				arr.push(this.src);
		});
	}

	function closeSelWindow(ev)
	{
		selectPopup.close();
	}

	select.onmousedown = function(ev) {
		ev = ev || window.event;

		if(!selectPopup.opened) {
			return;
		}

		if (ev.stopPropagation) ev.stopPropagation(); else ev.cancelBubble = true;
	};

	select.onclick = function(ev) {
		ev = ev || window.event;
		var urls = [];

		if(fbInput.getAttribute('disabled') === null || fbInput.getAttribute('disabled') === false) {
			if(selectPopup.opened) {
				closeSelWindow();
			}
			else {
				urls.length=0;
				extractImageUrls(urls, options.getText());
				selectPopup.open(urls);
				setTimeout(function() {	DOM.addEventListener(document, 'mousedown', closeSelWindow, false); }, 0);
			}
		}

		if(ev.preventDefault) {
			ev.preventDefault();
		}
		else {
			ev.returnValue = false;
		}
	}
});


/* file-end: js/fb-select-image.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/template.js 
*/

/*
Template - Copyright 2005 Six Apart
$Id: template.js 293 2012-04-16 09:06:54Z dpetrov $

Copyright (c) 2005, Six Apart, Ltd.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

    * Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.

    * Redistributions in binary form must reproduce the above
copyright notice, this list of conditions and the following disclaimer
in the documentation and/or other materials provided with the
distribution.

    * Neither the name of "Six Apart" nor the names of its
contributors may be used to endorse or promote products derived from
this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/


/* core template object */

Template = new Class( Object, {
    beginToken: "[#",
    endToken: "#]",
    
    
    init: function( source ) {
        if( source )
            this.compile( source );
    },
    
    
    compile: function( source ) {
        var statements = [
            "context.open();",
            "with( context.vars ) {"
        ];
        
        var start = 0, end = -this.endToken.length;
        while( start < source.length ) {
            end += this.endToken.length;
            
            // plaintext
            start = source.indexOf( this.beginToken, end );
            if( start < 0 )
                start = source.length;
            //we remove json.js dependency
            if( start > end )
                statements.push( 'context.write( ', '"' + source.substring( end, start ).escapeJS() + '"', ' );' );
            start += this.beginToken.length;
            
            // code
            if( start >= source.length )
                break;
            end = source.indexOf( this.endToken, start );
            if( end < 0 )
                throw "Template parsing error: Unable to find matching end token (" + this.endToken + ").";
            var length = (end - start);
            
            // empty tag
            if( length <= 0 )
                continue;
            
            // comment
            else if( length >= 4 &&
                source.charAt( start ) == "-" && source.charAt( start + 1 ) == "-" &&
                source.charAt( end - 1 ) == "-" && source.charAt( end - 2 ) == "-" )
                continue;
            
            // write
            else if( source.charAt( start ) == "=" )
                statements.push( "context.write( ", source.substring( start + 1, end ), " );" );
            
            // filters
            else if( source.charAt( start ) == "|" ) {
                start += 1;

                // find the first whitespace
                var afterfilters = source.substring(start,end).search(/\s/);
                
                var filters;
                if (afterfilters > 0) {
                    // allow pipes or commas to seperate filters
                    // split the string, reverse and rejoin to reverse it
                    filters = source.substring(start,start + afterfilters).replace(/,|\|/g,"").split('');
                    afterfilters += 1; // data starts after whitespace and filter list
                } else {
                    // default to escapeHTML
                    filters = ["h"];
                }
                // we have to do them in reverse order
                filters = filters.reverse();
               
                // start with our original filter number
                var numfilters = filters.length;
                
                // add the text between [#|  #]
                filters.push(source.substring( start + afterfilters, end ));
                
                // adjust each filter into a function call
                // eg. u ( h ( H ( blah ) ) )
                for (i=0; i<numfilters; i++) {
                    filters[i] = "context.f."+filters[i]+"( ";
                    filters.push(" )");
                }
                
                statements.push( "context.write( " + filters.join('') + " );");
            }
            
            // evaluate
            else
                statements.push( source.substring( start, end ) );
        }
        
        statements.push( "} return context.close();" );

        this.exec = new Function( "context", statements.join( "\n" ) );
    },
    
    
    exec: function( context ) {
        return "";
    }
} );


/* static members */

Template.templates = {};


/* context object */

Template.Context = new Class( Object, {
    init: function( vars, templates ) {
        this.vars = vars || {};
        this.templates = templates || Template.templates;
        this.stack = [];
        this.out = [];
        this.f = Template.Filter;
    },
    
    
    include: function( name ) {
        return this.templates[ name ].exec( this );
    },


    write: function() {
        this.out.push.apply( this.out, arguments );
    },


    writeln: function() {
        this.write.apply( this, arguments );
        this.write( "\n" );
    },

    
    clear: function() {
        this.out.length = 0;
    },


    getOutput: function() {
        return this.out.join( "" );
    },
    
    
    open: function() {
        this.stack.push( this.out );
        this.out = [];
    },
    
    
    close: function() {
        var result = this.getOutput();
        this.out = this.stack.pop() || [];
        return result;
    }
   
} );

/* filters */

Template.Filter = {

    // escapeHTML
    h: function(obj) {
        var div = document.createElement('div');
        var textNode = document.createTextNode(obj);
        div.appendChild(textNode);
        return (div.innerHTML);
    },

    // unescapeHTML
    H: function(obj) {
        return (unescape(obj));
    },

    // encodeURL
    u: function(obj) {
        return (escape(obj).replace(/\//g,"%2F"));
    }

};



/* file-end: js/template.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/userpicselect.js 
*/

UserpicSelect = new Class (LJ_IPPU, {
  init: function () {
    UserpicSelect.superClass.init.apply(this, ["Choose Userpic"]);

    this.setDimensions("550px", "441px");

    this.selectedPicid = null;
    this.displayPics = null;
    this.dataLoaded = false;
    this.imgScale = 1;

    this.picSelectedCallback = null;

    var template = new Template( UserpicSelect.top );
    var templates = { body: template };
    this.setContent(template.exec( new Template.Context( {}, templates ) ));
    this.setHiddenCallback(this.hidden.bind(this));
  },

  show: function() {
    UserpicSelect.superClass.show.apply(this, []);

    if (!this.dataLoaded) {
      this.setStatus("Loading...");
      this.loadPics();
      this.dataLoaded = true;
    } else {
      this.redraw();
    }
  },

  // hide the hourglass when window is closed
  hidden: function () {
    if (this.hourglass)
      this.hourglass.hide();
  },

  // set a callback to be called when the "select" button is clicked
  setPicSelectedCallback: function (callback) {
    this.picSelectedCallback = callback;
  },

  // called when the "select" button is clicked
  closeButtonClicked: function (evt) {
      if (this.picSelectedCallback) {
          var selectedKws = [];
          if (this.selectedPicid) {
              var kws = this.pics.pics[this.selectedPicid+""].keywords;
              if (kws && kws.length) selectedKws = kws;
          }

          this.picSelectedCallback(this.selectedPicid, selectedKws);
      }

    this.hide();
  },

  setStatus: function(status) {
      this.setField({'status': status});
  },

  setField: function(vars) {
    var template = new Template( UserpicSelect.dynamic );
    var userpics_template = new Template( UserpicSelect.userpics );

    var templates = {
      body: template,
      userpics: userpics_template
    };

    if (!vars.pics)
      vars.pics = this.pics || {};

    if (!vars.status)
      vars.status = "";

    vars.imgScale = this.imgScale;

    $("ups_dynamic").innerHTML = (template.exec( new Template.Context( vars, templates ) ));

    if (!vars.pics.ids)
      return;

    // we redrew the window so reselect the current selection, if any
    if (this.selectedPicid)
      this.selectPic(this.selectedPicid);

    var ST = new SelectableTable();
    ST.init({
        "table": $("ups_userpics_t"),
            "selectedClass": "ups_selected_cell",
            "selectableClass": "ups_cell",
            "multiple": false,
            "selectableItem": "cell"
            });

    var self = this;

    ST.addWatcher(function (data) {
        var selectedCell = data[0];

        if (!selectedCell) {
            // clear selection
            self.selectPic(null);
        } else {
            // find picid and select it
            var parentCell = DOM.getFirstAncestorByClassName(selectedCell, "ups_cell", true);
            if (!parentCell) return;

            var picid = parentCell.getAttribute("lj_ups:picid");
            if (!picid) return;

            self.selectPic(picid);
        }
    });

    DOM.addEventListener($("ups_closebutton"), "click", this.closeButtonClicked.bindEventListener(this));

    // set up image scaling buttons
    var scalingSizes = [3,2,1];
    var baseSize = 25;
    var scalingBtns = $("ups_scaling_buttons");
    this.scalingBtns = [];

    if (scalingBtns) {
        scalingSizes.forEach(function (scaleSize) {
            var scaleBtn = document.createElement("img");

            scaleBtn.style.width = scaleBtn.width = scaleBtn.style.height = scaleBtn.height = baseSize - scaleSize * 5;

            scaleBtn.src = Site.imgprefix + "/imgscale.png";
            DOM.addClassName(scaleBtn, "ups_scalebtn");

            self.scalingBtns.push(scaleBtn);

            DOM.addEventListener(scaleBtn, "click", function (evt) {
                Event.stop(evt);

                self.imgScale = scaleSize;
                self.scalingBtns.forEach(function (otherBtn) {
                    DOM.removeClassName(otherBtn, "ups_scalebtn_selected");
                });

                DOM.addClassName(scaleBtn, "ups_scalebtn_selected");

                self.redraw();
            });

            scalingBtns.appendChild(scaleBtn);

            if (self.imgScale == scaleSize)
                DOM.addClassName(scaleBtn, "ups_scalebtn_selected");
        });
    }
  },

  kwmenuChange: function(evt) {
    this.selectPic($("ups_kwmenu").value);
  },

  selectPic: function(picid) {
    if (this.selectedPicid) {
        DOM.removeClassName($("ups_upicimg" + this.selectedPicid), "ups_selected");
        DOM.removeClassName($("ups_cell" + this.selectedPicid), "ups_selected_cell");
    }

    this.selectedPicid = picid;

    if (picid) {
        // find the current pic and cell
        var picimg =  $("ups_upicimg" + picid);
        var cell   =  $("ups_cell" + picid);

        if (!picimg || !cell)
            return;

        // hilight the userpic
        DOM.addClassName(picimg, "ups_selected");

        // hilight the cell
        DOM.addClassName(cell, "ups_selected_cell");

        // enable the select button
        $("ups_closebutton").disabled = false;

        // select the current selectedPicid in the dropdown
        this.setDropdown();
    } else {
        $("ups_closebutton").disabled = true;
    }
  },

  // filter by keyword/comment
  filterPics: function(evt) {
    var searchbox = $("ups_search");

    if (!searchbox)
      return;

    var filter = searchbox.value.toLocaleUpperCase();
    var pics = this.pics;

    if (!filter) {
      this.setPics(pics);
      return;
    }

    // if there is a filter and there is selected text in the field assume that it's
    // inputcomplete text and ignore the rest of the selection.
    if (searchbox.selectionStart && searchbox.selectionStart > 0)
      filter = searchbox.value.substr(0, searchbox.selectionStart).toLocaleUpperCase();

    var newpics = {
      "pics": [],
      "ids": []
    };

    for (var i=0; i<pics.ids.length; i++) {
      var picid = pics.ids[i];
      var pic = pics.pics[picid];

      if (!pic)
        continue;

      for (var j=0; j < pic.keywords.length; j++) {
        var kw = pic.keywords[j];

        var piccomment = "";
        if (pic.comment)
          piccomment = pic.comment.toLocaleUpperCase();

        if(kw.toLocaleUpperCase().indexOf(filter) != -1 || // matches a keyword
           (piccomment && piccomment.indexOf(filter) != -1) || // matches comment
           (pic.keywords.join(", ").toLocaleUpperCase().indexOf(filter) != -1)) { // matches comma-seperated list of keywords

          newpics.pics[picid] = pic;
          newpics.ids.push(picid);
          break;
        }
      }
    }

    if (this.pics != newpics)
      this.setPics(newpics);

    // if we've filtered down to one pic and we don't currently have a selected pic, select it
    if (newpics.ids.length == 1 && !this.selectedPicid)
      this.selectPic(newpics.ids[0]);
  },

  setDropdown: function(pics) {
    var menu = $("ups_kwmenu");

    for (var i=0; i < menu.length; i++)
      menu.remove(i);

    menu.length = 0;

    if (!pics)
      pics = this.pics;

    if (!pics || !pics.ids)
      return;

    for (var i=0; i < pics.ids.length; i++) {
      var picid = pics.ids[i];
      var pic = pics.pics[picid];

      if (!pic)
        continue;

      var sel = false;
      var self = this;

      pic.keywords.forEach(function (kw) {
		// add to dropdown
		var picopt = new Option(kw, picid);

          if (!sel) {
              picopt.selected = self.selectedPicid ? self.selectedPicid == picid : false;
              sel = picopt.selected;
          }
		menu.options[menu.options.length] = picopt;
      });
    }
  },

  picsReceived: function(picinfo) {
    if (picinfo && picinfo.alert) { // got an error
      this.handleError(picinfo.alert);
      return;
    }

    if (!picinfo || !picinfo.ids || !picinfo.pics || !picinfo.ids.length)
      return;

    var piccount = picinfo.ids.length;

    // force convert integers to strings
    for (var i=0; i < piccount; i++) {
      var picid = picinfo.ids[i];

      var pic = picinfo.pics[picid];

      if (!pic)
        continue;

      if (pic.comment)
        pic.comment += "";

      for (var j=0; j < pic.keywords.length; j++)
        pic.keywords[j] += "";
    }

    // set default scaling size based on how many pics there are
    if (piccount < 30) {
        this.imgScale = 1;
    } else if (piccount < 60) {
        this.imgScale = 2;
    } else {
        this.imgScale = 3;
    }

    this.pics = picinfo;

    this.setPics(picinfo);
    this.redraw();

    if (this.hourglass)
      this.hourglass.hide();
  },

  redraw: function () {
    this.setStatus();

    if (!this.pics)
      return;

    this.setPics(this.pics);

    if (this.hourglass)
      this.hourglass.hide();

    var keywords = [], comments = [];
    for (var i=0; i < this.pics.ids.length; i++) {
      var picid = this.pics.ids[i];
      var pic = this.pics.pics[picid];

      for (var j=0; j < pic.keywords.length; j++)
        keywords.push(pic.keywords[j]);

      comments.push(pic.comment);
    }

    var searchbox = $("ups_search");
    var compdata = new InputCompleteData(keywords.concat(comments));
    var whut = new InputComplete(searchbox, compdata);

    DOM.addEventListener(searchbox, "keydown",  this.filterPics.bind(this));
    DOM.addEventListener(searchbox, "keyup",    this.filterPics.bind(this));
    DOM.addEventListener(searchbox, "focus",    this.filterPics.bind(this));

    try {
      searchbox.focus();
    } catch(e) {}

    DOM.addEventListener($("ups_kwmenu"), "change", this.kwmenuChange.bindEventListener(this));
  },

  setPics: function(pics) {
    if (this.displayPics == pics)
      return;

    this.displayPics = pics;

    this.setField({'pics': pics});
    this.setDropdown(pics);
  },

  handleError: function(err) {
    this.hourglass.hide();
  },

  loadPics: function() {
    this.hourglass = new Hourglass($("ups_userpics"));
    var reqOpts = {};
    reqOpts.url = Site.currentJournal ? "/" + Site.currentJournal + "/__rpc_userpicselect" : "/__rpc_userpicselect";
    reqOpts.onData = this.picsReceived.bind(this);
    reqOpts.onError = this.handleError.bind(this);
    HTTPReq.getJSON(reqOpts);
  }
});

// Templates
UserpicSelect.top = "\
      <div class='ups_search'>\
       <span class='ups_searchbox'>\
         Search: <input type='text' id='ups_search'>\
         Select: <select id='ups_kwmenu'><option value=''></option></select>\
         </span>\
      </div>\
      <div id='ups_dynamic'></div>";

UserpicSelect.dynamic = "\
       [# if (status) { #] <div class='ups_status'>[#| status #]</div> [# } #]\
         <div class='ups_userpics' id='ups_userpics'>\
           [#= context.include( 'userpics' ) #]\
           &nbsp;\
         </div>\
      <div class='ups_closebuttonarea'>\
       <input type='button' id='ups_closebutton' value='Select' disabled='true'  />\
       <span id='ups_scaling_buttons'>\
       </span>\
      </div>";

UserpicSelect.userpics = "\
[# if(pics && pics.ids) { #] \
     <table class='ups_table' cellpadding='0' cellspacing='0' id='ups_userpics_t'> [# \
       var rownum = 0; \
       for (var i=0; i<pics.ids.length; i++) { \
          var picid = pics.ids[i]; \
          var pic = pics.pics[picid]; \
\
          if (!pic) \
            continue; \
\
          var pickws = pic.keywords; \
          if (i%2 == 0) { #] \
            <tr class='ups_row ups_row[#= rownum++ % 2 + 1 #]'> [# } #] \
\
            <td class='ups_cell'  \
                           lj_ups:picid='[#= picid #]' id='ups_cell[#= picid #]'> \
              <div class='ups_container'> \
              <img src='[#= pic.url #]' width='[#= finiteInt(pic.width/imgScale) #]' \
                 height='[#= finiteInt(pic.height/imgScale) #]' id='ups_upicimg[#= picid #]' class='ups_upic' /> \
               </div> \
\
              <b>[#| pickws.join(', ') #]</b> \
             [# if(pic.comment) { #]<br/>[#= pic.comment #][# } #] \
              <div class='ljclear'>&nbsp;</div>\
            </td> \
\
            [# if (i%2 == 1 || i == pics.ids.length - 1) { #] </tr> [# } \
        } #] \
     </table> \
  [# } #] \
";

// Copied here from entry.js
function insertViewThumbs() {
    var lj_userpicselect = $('lj_userpicselect');
    lj_userpicselect.innerHTML = Site.ml_text.userpic_title;
}



/* file-end: js/userpicselect.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/inputcomplete.js 
*/

/* input completion library */

/* TODO:
    -- lazy data model (xmlhttprequest, or generic callbacks)
    -- drop-down menu?
    -- option to disable comma-separated mode (or explicitly ask for it)
*/

/*
  Copyright (c) 2005, Six Apart, Ltd.
  All rights reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are
  met:

  * Redistributions of source code must retain the above copyright
  notice, this list of conditions and the following disclaimer.

  * Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the following disclaimer
  in the documentation and/or other materials provided with the
  distribution.

  * Neither the name of "Six Apart" nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
  "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
  A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
  OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
  SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/


/* ***************************************************************************

  Class: InputCompleteData

  About: An InputComplete object needs a data source to auto-complete
          from.  This is that model.  You can create one from an
          array, or create a lazy version that gets its data over the
          network, on demand.  You will probably not use this class'
          methods directly, as they're called by the InputComplete
          object.

          The closer a word is to the beginning of the array, the more
          likely it will be recommended as the word the user is typing.

          If you pass the string "ignorecase" as the second argument in
          the constructor, then the case of both the user's input and
          the data in the array will be ignored when looking for a match.

  Constructor:

    var model = new InputCompleteData ([ "foo", "bar", "alpha" ]);

*************************************************************************** */

var InputCompleteData = new Class ( Object, {
    init: function () {
        if (arguments[0] instanceof Array) {
            this.source = [];

            // copy the user-provided array (which is sorted most
            // likely to least likely) into our internal form, which
            // is opposite, with most likely at the end.
            var arg = arguments[0];
            for (var i=arg.length-1; i>=0; i--) {
                this.source.length++;
                this.source[this.source.length-1] = arg[i];
            }
        }

        this.ignoreCase = 0;
        if (arguments[1] == "ignorecase") {
            this.ignoreCase = 1;
        }
    },

    // method: given prefix, returns best suffix, or null if no answer
    bestFinish: function (pre) {
        if (! pre || pre.length == 0)
            return null;

        if (! this.source)
            return null;

        var i;
        for (i=this.source.length-1; i>=0; i--) {
            var item = this.source[i];

            var itemToCompare = item;
            var preToCompare = pre;
            if (this.ignoreCase) {
                item += '';
                pre += '';
                itemToCompare = item.toLowerCase();
                preToCompare = pre.toLowerCase();
            }

            if (itemToCompare.substring(0, pre.length) == preToCompare) {
                var suff = item.substring(pre.length, item.length);
                return suff;
            }
        }

        return null;
    },

    // method: given a piece of data, learn it, and prioritize it for future completions
    learn: function (word) {
        if (!word) return false;
        if (!this.source) return false;
        this.source[this.source.length++] = word;

        if (this.onModelChange)
            this.onModelChange();
    },

    getItems: function () {
        if (!this.source) return [];

        // return only unique items to caller
        var uniq = [];
        var seen = {};
        for (i=this.source.length-1; i>=0; i--) {
            var item = this.source[i];
            if (! seen[item]) {
                seen[item] = 1;
                uniq.length++;
                uniq[uniq.length - 1] = item;
            }
        }

        return uniq;
    },

    dummy: 1
});

/* ***************************************************************************

  Class: InputComplete

  About:

  Constructor:

*************************************************************************** */

var InputComplete = new Class( Object, {
    init: function () {
        var opts = arguments[0];
        var ele;
        var model;
        var debug;

        if (arguments.length == 1) {
            ele = opts["target"];
            model = opts["model"];
            debug = opts["debug"];
        } else {
            ele = arguments[0];
            model = arguments[1];
            debug = arguments[2];
        }

        this.ele   = ele;
        this.model = model;
        this.debug = debug;

        // no model?  don't setup object.
        if (! ele) {
            this.disabled = true;
            return;
        }

        // return false if auto-complete won't work anyway
        if (! (("selectionStart" in ele) || (document.selection && document.selection.createRange)) ) {
            this.disabled = true;
            return false;
        }

        DOM.addEventListener(ele, "focus",   InputComplete.onFocus.bindEventListener(this));
        DOM.addEventListener(ele, "keydown", InputComplete.onKeyDown.bindEventListener(this));
        DOM.addEventListener(ele, "keyup",   InputComplete.onKeyUp.bindEventListener(this));
        DOM.addEventListener(ele, "keypress",InputComplete.onKeyPress.bindEventListener(this));
        DOM.addEventListener(ele, "blur",    InputComplete.onBlur.bindEventListener(this));
    },

    // returns the word currently being typed, or null
    wordInProgress: function () {
        var sel = DOM.getSelectedRange(this.ele);

        var cidx = sel.start; // current indx
        var sidx = cidx;  // start of word index
        while (sidx > 0 && this.ele.value.charAt(sidx) != ',') {
            sidx--;
        }
        var skipStartForward = function (chr) { return (chr == "," || chr == " "); }

        while (skipStartForward(this.ele.value.charAt(sidx))) {
            sidx++;
        }

        return this.ele.value.substring(sidx, this.ele.value.length);
    },

    // appends some selected text after the care
    addSelectedText: function (chars) {
        var sel = DOM.getSelectedRange(this.ele);
        this.ele.value = this.ele.value + chars;
        DOM.setSelectedRange(this.ele, sel.start, this.ele.value.length);
    },

    moveCaretToEnd: function () {
        var len = this.ele.value.length;
        DOM.setSelectedRange(this.ele, len, len);
    },

    // returns true if caret is at end of line, or everything to the right
    // of us is selected
    caretAtEndOfNotSelected: function (sel) {
        sel = sel || DOM.getSelectedRange(this.ele);
        var len = this.ele.value.length;
        return sel.end == len;
    },

    disable: function () {
        this.disabled = true;
    },

    dummy: 1
});

InputComplete.onKeyDown = function (e) {
    if (this.disabled) return;

    var code = e.keyCode || e.which;

    // if comma, but not with a shift which would be "<".  (FIXME: what about other keyboards layouts?)
    //FIXME: may be there is a stable cross-browser way to detect so-called other keyboard layouts - but i don't know anything easier than ... (see onKeyUp changes in tis revision)
    /*if ((code == 188 || code == 44) && ! e.shiftKey && this.caretAtEndOfNotSelected()) {
        this.moveCaretToEnd();
        return Event.stop(e);
    }*/

    return true;
};

InputComplete.onKeyUp = function (e) {
    if (this.disabled) return;

    var val = this.ele.value;

    var code = e.keyCode || e.which;

    // ignore tab, backspace, left, right, delete, and enter
    if (code == 9 || code == 8 || code == 37 || code == 39 || code == 46 || code == 13)
       return false;

    var sel = DOM.getSelectedRange(this.ele);

    var ss = sel.start;
    var se = sel.end;

    // only auto-complete if we're at the end of the line
    if (se != val.length) return false;

    var chr = String.fromCharCode(code);

    //if (code == 188 || chr == ",") {
    if(/,$/.test(val)){	
        if (! this.caretAtEndOfNotSelected(sel)) {
            return false;
        }

        this.ele.value = this.ele.value.replace(/[\s,]+$/, "") + ", ";
        this.moveCaretToEnd();

        return Event.stop(e);
    }


    var inProg = this.wordInProgress();
    if (!inProg) return true;

    var rest = this.model.bestFinish(inProg);

    if (rest && rest.length > 0) {
        this.addSelectedText(rest);
    }
};

InputComplete.onKeyPress = function (e) {
    e = jQuery.event.fix(e);
    // 10 is IE with ctrlKey
    if ((e.which === 13 || e.which === 10) && !e.ctrlKey) {
        var sel = DOM.getSelectedRange(this.ele);
        if (sel.start !== sel.end) {
            e.preventDefault();
            DOM.setSelectedRange(this.ele, sel.end, sel.end);
        }
    }
};

InputComplete.onBlur = function (e) {
    if (this.disabled) return;

    var tg = e.target;
    var list = tg.value;

    var noendjunk = list.replace(/[\s,]+$/, "");
    if (noendjunk != list) {
        tg.value = list = noendjunk;
    }

    var tags = list.split(",");
    for (var i =0; i<tags.length; i++) {
        var tag = tags[i].replace(/^\s+/,"").replace(/\s+$/,"");
        if (tag.length) {
            this.model.learn(tag);
        }
    }
};

InputComplete.onFocus = function (e) {
    if (this.disabled) return;
};


/* file-end: js/inputcomplete.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/datasource.js 
*/

// datasource base class, the "M" in MVC
// subclass this and override theData to provide your data

/* date extensions */

Object.extend(Date, {
	/*  iso 8601 date format parser
		this was fun to write...
		thanks to: http://www.cl.cam.ac.uk/~mgk25/iso-time.html */
	
	matchISOString: new RegExp(
		"^([0-9]{4})" +													 // year
		"(?:-(?=0[1-9]|1[0-2])|$)(..)?" +								   // month
		"(?:-(?=0[1-9]|[12][0-9]|3[01])|$)([0-9]{2})?" +					// day of the month
		"(?:T(?=[01][0-9]|2[0-4])|$)T?([0-9]{2})?" +						// hours
		"(?::(?=[0-5][0-9])|\\+|-|Z|$)([0-9]{2})?" +						// minutes
		"(?::(?=[0-5][0-9]|60$|60[+|-|Z]|60.0+)|\\+|-|Z|$):?([0-9]{2})?" +  // seconds
		"(\.[0-9]+)?" +													 // fractional seconds
		"(Z|\\+[01][0-9]|\\+2[0-4]|-[01][0-9]|-2[0-4])?" +				  // timezone hours
		":?([0-5][0-9]|60)?$"											   // timezone minutes
	),
	// use only datasource.js
	fromISOString: function( string ) {
		var t = this.matchISOString.exec( string );
		if( !t )
			return undefined;
		
		var year = finiteInt( t[ 1 ], 10 );
		var month = finiteInt( t[ 2 ], 10 ) - 1;
		var day = finiteInt( t[ 3 ], 10 );
		var hours = finiteInt( t[ 4 ], 10 );
		var minutes = finiteInt( t[ 5 ], 10 );
		var seconds = finiteInt( t[ 6 ], 10 );
		var milliseconds = finiteInt( Math.round( parseFloat( t[ 7 ] ) * 1000 ) );
		var tzHours = finiteInt( t[ 8 ], 10 );
		var tzMinutes = finiteInt( t[ 9 ], 10 );
		
		var date = new this( 0 );
		if (t[ 8 ] === undefined) {
			date.setUTCFullYear( year, month, day );
			date.setUTCHours( hours, minutes, seconds, milliseconds );
			var offset = (tzHours * 60 + tzMinutes) * 60000;
			if( offset )
				date = new this( date - offset );
		} else {
			date.setFullYear( year, month, day );
			date.setHours( hours, minutes, seconds, milliseconds );
		}
		
		return date;
	}
});

DataSource = new Class(Object, {

  init: function (initialData) {
    DataSource.superClass.init.apply(this, arguments);
    this.watchers = [];
    this.theData = initialData || [];
    this.sortField = "";
    this.sortType = "";
    this.sortDesc = false;
  },

  addWatcher: function (callback) {
    this.watchers.add(callback);
  },

  removeWatcher: function (callback) {
    this.watchers.remove(callback);
  },

  // call this if updating data and not using _setData
  _updated: function () {
    this.callWatchers();
  },

  callWatchers: function () {
    for (var i = 0; i < this.watchers.length; i++)
      this.watchers[i].apply(this, [this.data()]);
  },

  setData: function (theData) {
    this.theData = theData;

    if (this.sortField)
      this.sortDataBy(this.sortField, this.sortType, this.sortDesc);

    this._setData(theData);
  },

  _setData: function (theData) {
    this.theData = theData;
    this.callWatchers();
    return theData;
  },

  data: function () {
    return this.theData;
  },

  sortBy: function () {
    return this.sortField;
  },

  sortInverted: function () {
    return this.sortDesc;
  },

  // mimic some array functionality
  push: function (data) {
    this.theData.push(data);
    this.callWatchers();
  },

  pop: function () {
    var val = this.theData.pop();
    this.callWatchers();
    return val;
  },

  indexOf: function (value) {
    return this.theData.indexOf(value);
  },

  remove: function (value) {
    this.theData.remove(value);
    this.callWatchers();
  },

  empty: function () {
    this.theData = [];
    this.callWatchers();
  },

  length: function () {
    return this.theData.length;
  },

  totalLength: function () {
    return this.allData().length;
  },

  allData: function () {
    var theData = this.theData;

    if (this.dataField && theData)
      theData = theData[this.dataField];

    return theData;
  },

  sortDataBy: function (field, type, invert) {
    this.sortField = field;
    this.sortDesc = invert;
    this.sortType = type;

    if (!field || !this.theData || !this.theData.sort)
      return;

    var sorted = this.theData.sort(function (a, b) {
      var ad = a[""+field], bd = b[""+field];
      ad = ad ? ad : "";
      bd = bd ? bd : "";

      switch(type) {

      case "string":
        var aname = ad.toUpperCase(), bname = bd.toUpperCase();

        if (aname < bname)
          return -1;
        else if (aname > bname)
          return 1;
        else
          return 0;

      case "isodate":
        var datA = Date.fromISOString(ad) || new Date(0);
        var datB = Date.fromISOString(bd) || new Date(0);

        return ((datA - datB) || 0);

      default:
      case "numeric":
        return ad - bd;

      }
    });

    if (invert)
      sorted.reverse();

    this._setData(sorted);
  }

});


/* file-end: js/datasource.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/selectable_table.js 
*/

/*
  This is a datasource you can attach to a table. It will enable
  the selection of rows or cells in the table.

  The data in the datasource is elements that are selected.

  $id:$
*/

SelectableTable = new Class(DataSource, {

    // options:
    //   table: what table element to attach to
    //   selectableClass: if you only want elements with a certain class to be selectable,
    //       specifiy this class with selectableClass
    //   multiple: can more than one thing be selected at once? default is true
    //   selectedClass: class to apply to selected elements
    //   checkboxClass: since there are frequently checkboxes associated with selectable elements,
    //       you can specify the class of your checkboxes to make them stay in sync
    //   selectableItem: What type of elements can be selected. Values are "cell" or "row"
    init: function (opts) {
        SelectableTable.superClass.init.apply(this, []);

        var table = opts.table;
        var selectableClass = opts.selectableClass;
        var multiple = opts.multiple;
        var selectedClass = opts.selectedClass
        var checkboxClass = opts.checkboxClass
        var selectableItem = opts.selectableItem;

        selectableItem = selectableItem == "cell" ? "cell" : "row";

        if (multiple === undefined) multiple = true;

        this.table = table;
        this.selectableClass = selectableClass;
        this.multiple = multiple;
        this.selectedClass = opts.selectedClass;
        this.checkboxClass = opts.checkboxClass;

        this.selectedElements = [];

        // if it's not a table, die
        if (!table || !table.tagName || table.tagName.toLowerCase() != "table") return null;

        // get selectable items
        var tableElements = table.getElementsByTagName("*");

        var selectableElements;

        if (selectableItem == "cell") {
            selectableElements = DOM.filterElementsByTagName(tableElements, "td");
        } else {
            selectableElements = DOM.filterElementsByTagName(tableElements, "tr");
        }

        var self = this;
        selectableElements.forEach(function(ele) {
            // if selectableClass is defined and this element doesn't have the class, skip it
            if (selectableClass && !DOM.hasClassName(ele, selectableClass)) return;

            // attach click handler to every element inside the element
            var itemElements = ele.getElementsByTagName("*");
            for (var i = 0; i < itemElements.length; i++) {
                self.attachClickHandler(itemElements[i], ele);
            }

            // attach click handler to the element itself
            self.attachClickHandler(ele, ele);
        });
    },

    // stop our handling of this event
    stopHandlingEvent: function (evt) {
        if (!evt) return;

        // w3c
        if (evt.stopPropagation)
        evt.stopPropagation();

        // ie
        try {
            event.cancelBubble = true;
        } catch(e) {}
    },

    // attach a click handler to this element
    attachClickHandler: function (ele, parent) {
        if (!ele) return;

        var self = this;

        var rowClicked = function (evt) {
            // if it was a control-click, they're probably trying to open a new tab or something.
            // let's not handle it
            if (evt && (evt.ctrlKey || evt.metaKey)) return false;

            var tagName = ele.tagName.toLowerCase();

            // if this is a link or has an onclick handler,
            // return true and tell other events to return true
            if ((ele.href && tagName != "img") || ele.onclick) {
                self.stopHandlingEvent(evt);
                return true;
            }

            // if this is the child of a link, propagate the event up
            var ancestors = DOM.getAncestors(ele, true);
            for (var i = 0; i < ancestors.length; i++) {
                var ancestor = ancestors[i];
                if (ancestor.href && ancestor.tagName.toLowerCase() != "img") {
                    return true;
                }
            }

            // if this is an input or select element, skip it
            if ((tagName == "select" || tagName == "input") && parent.checkbox != ele) {
                self.stopHandlingEvent(evt);
                return true;
            }

            // toggle selection of this parent element
            if (self.selectedElements.indexOf(parent) != -1) {
                if (self.selectedClass) DOM.removeClassName(parent, self.selectedClass);

                self.selectedElements.remove(parent);
            } else {
                if (self.selectedClass) DOM.addClassName(parent, self.selectedClass);

                if (self.multiple) {
                    self.selectedElements.push(parent);
                } else {
                    if (self.selectedClass && self.selectedElements.length > 0) {
                        var oldParent = self.selectedElements[0];
                        if (oldParent) {
                            DOM.removeClassName(oldParent, self.selectedClass);
                            if (oldParent.checkbox) oldParent.checkbox.checked = "";
                        }
                    }

                    self.selectedElements = [parent];
                }
            }

            // update our data
            self.setData(self.selectedElements);

            // if there's a checkbox associated with this parent, set it's value
            // to the parent selected value
            if (parent.checkbox) parent.checkbox.checked = (self.selectedElements.indexOf(parent) != -1) ? "on" : '';
            if (parent.checkbox == ele) { self.stopHandlingEvent(evt); return true; }

            // always? not sure
            if (evt)
                Event.stop(evt);
        }

        // if this is a checkbox we need to keep in sync, set up its event handler
        if (this.checkboxClass && ele.tagName.toLowerCase() == "input"
            && ele.type == "checkbox" && DOM.hasClassName(ele, this.checkboxClass)) {

            parent.checkbox = ele;

            // override default event handler for the checkbox
            DOM.addEventListener(ele, "click", function (evt) {
                return true;
            });
        }

        // attach a method to the row so other people can programatically
        // select it.
        ele.rowClicked = rowClicked;

        DOM.addEventListener(ele, "click", rowClicked);
    }

});


/* file-end: js/selectable_table.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/quickreply.js 
*/

QuickReply = {
	lastDiv: 'qrdiv',
	
	reply: function(dtid, pid, newsubject)
	{
		var targetname = 'ljqrt' + dtid,
			targetcomment = 'ljcmt' + dtid,
			qr_ptid = $('parenttalkid'),
			qr_rto = $('replyto'),
			qr_dtid = $('dtid'),
			qr_div = $('qrdiv'),
			cur_div = $(targetname),
			qr_form_div = $('qrformdiv'),
			qr_form = $('qrform'),
			subject = $('subject');
		
		// Is this a dumb browser?
		if (!qr_ptid || !qr_rto || !qr_dtid || !qr_div || !cur_div || !qr_form || !qr_form_div || !subject) {
			return true;
		}
		
		qr_ptid.value = pid;
		qr_dtid.value = dtid;
		qr_rto.value = pid;
		
		if (QuickReply.lastDiv == 'qrdiv') {
			qr_div.style.display = 'inline';
			// Only one swap
		} else if (QuickReply.lastDiv != dtid) {
		}

		var comments = $('comments'),
			targetcomment = $(targetcomment);

		//LJSUP-11059: when we show old style entry page, comment form should be placed under comment with
		//shift according to its depth.
		if (!comments || comments.className.indexOf('entry-comments-s1') === -1 || !targetcomment) {
			cur_div.parentNode.insertBefore(qr_div, cur_div);
		} else {
			targetcomment.appendChild(qr_div);
		}
		
		QuickReply.lastDiv = targetname;
		
		if (!subject.value || subject.value == subject.defaultValue || subject.value.substr(0, 4) == 'Re: ') {
			subject.value = newsubject;
			subject.defaultValue = newsubject;
		}
		
		qr_form_div.className = cur_div.className || '';
		
		// have to set a timeout because most browsers won't let you focus
		// on an element that's still in the process of being created.
		// so lame.
		window.setTimeout(function(){ qr_form.body.focus() }, 100);
		
		return false;
	},
	
	more: function()
	{
		var qr_form = $('qrform'),
			basepath = $('basepath'),
			dtid = $('dtid'),
			pidform = $('parenttalkid');
		
		// do not do the default form action (post comment) if something is broke
		if (!qr_form || !basepath || !dtid || !pidform) {
			return false;
		}
		
		if(dtid.value > 0 && pidform.value > 0) {
			//a reply to a comment
			qr_form.action = basepath.value + "replyto=" + dtid.value + "#add_comment";
		} else {
			qr_form.action = basepath.value + "mode=reply#add_comment";
		}
		
		// we changed the form action so submit ourselves
		// and don't use the default form action
		qr_form.submit();
		return false;
	},
	
	submit: function()
	{
		var submitmore = $('submitmoreopts'),
			submit = $('submitpost');
		
		if (!submitmore || !submit) {
			return false;
		}
		
		submit.disabled = true;
		submitmore.disabled = true;
		
		// New top-level comments
		var dtid = $('dtid');
		if (!Number(dtid.value)) {
			dtid.value =+ 0;
		}
		
		var qr_form = $('qrform');
		qr_form.action = Site.siteroot + '/talkpost_do.bml';
		qr_form.submit();
		
		// don't do default form action
		return false;
	},
	
	check: function()
	{
		var qr_form = $('qrform');
		if (!qr_form) return true;
		var len = qr_form.body.value.length;
		if (len > 4300) {
			alert('Sorry, but your comment of ' + len + ' characters exceeds the maximum character length of 4300. Please try shortening it and then post again.');
			return false;
		}
		return true;
	},
	
	// Maintain entry through browser navigations.
	save: function()
	{
		var qr_form = $('qrform');
		if (!qr_form) {
			return false;
		}
		var do_spellcheck = $('do_spellcheck'),
			qr_upic = $('prop_picture_keyword');
		
		$('saved_body').value = qr_form.body.value;
		$('saved_subject').value = $('subject').value;
		$('saved_dtid').value = $('dtid').value;
		$('saved_ptid').value = $('parenttalkid').value;
		
		if (do_spellcheck) {
			$('saved_spell').value = do_spellcheck.checked;
		}
		if (qr_upic) { // if it was in the form
			$('saved_upic').value = qr_upic.selectedIndex;
		}
		
		return false;
	},
	
	// Restore saved_entry text across platforms.
	restore: function()
	{
		setTimeout(function(){
			var saved_body = $('saved_body'),
				dtid = $('saved_dtid'),
				subject = $('saved_subject'),
				subject_str = '',
				qr_form = $('qrform');
			if (!saved_body || saved_body.value == '' || !qr_form || !dtid) {
				return;
			}
			
			if (subject) {
				subject_str = subject.value;
			}
			
			QuickReply.reply(dtid.value, parseInt($('saved_ptid').value, 10), subject_str);
			
			qr_form.body.value = saved_body.value;
			
			// if it was in the form
			var upic = $('prop_picture_keyword');
			if (upic) {
				upic.selectedIndex = $('saved_upic').value;
			}
			
			var spellcheck = $('do_spellcheck');
			if (spellcheck) {
				spellcheck.checked = $('saved_spell').value == 'true';
			}
		}, 100);
	},
	
	userpicSelect: function()
	{
		var ups = new UserpicSelect();
		ups.init();
		ups.setPicSelectedCallback(function(picid, keywords)
		{
			var kws_dropdown = $('prop_picture_keyword');
			
			if (kws_dropdown) {
				var items = kws_dropdown.options;
				
				// select the keyword in the dropdown
				keywords.forEach(function(kw)
				{
					for (var i = 0; i < items.length; i++) {
						var item = items[i];
						if (item.value == kw) {
							kws_dropdown.selectedIndex = i;
							return;
						}
					}
				});
			}
		});
		ups.show();
	}
}

jQuery(QuickReply.restore);
DOM.addEventListener(window, 'unload', QuickReply.save);


/* file-end: js/quickreply.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/md5.js 
*/

/*
 *  md5.jvs 1.0b 27/06/96
 *
 * Javascript implementation of the RSA Data Security, Inc. MD5
 * Message-Digest Algorithm.
 *
 * Copyright (c) 1996 Henri Torgemane. All Rights Reserved.
 *
 * Permission to use, copy, modify, and distribute this software
 * and its documentation for any purposes and without
 * fee is hereby granted provided that this copyright notice
 * appears in all copies. 
 *
 * Of course, this soft is provided "as is" without express or implied
 * warranty of any kind.
 */



function array(n) {
  for(i=0;i<n;i++) this[i]=0;
  this.length=n;
}

/* Some basic logical functions had to be rewritten because of a bug in
 * Javascript.. Just try to compute 0xffffffff >> 4 with it..
 * Of course, these functions are slower than the original would be, but
 * at least, they work!
 */

function integer(n) { return n%(0xffffffff+1); }

function shr(a,b) {
  a=integer(a);
  b=integer(b);
  if (a-0x80000000>=0) {
    a=a%0x80000000;
    a>>=b;
    a+=0x40000000>>(b-1);
  } else
    a>>=b;
  return a;
}

function shl1(a) {
  a=a%0x80000000;
  if (a&0x40000000==0x40000000)
  {
    a-=0x40000000;  
    a*=2;
    a+=0x80000000;
  } else
    a*=2;
  return a;
}

function shl(a,b) {
  a=integer(a);
  b=integer(b);
  for (var i=0;i<b;i++) a=shl1(a);
  return a;
}

function and(a,b) {
  a=integer(a);
  b=integer(b);
  var t1=(a-0x80000000);
  var t2=(b-0x80000000);
  if (t1>=0) 
    if (t2>=0) 
      return ((t1&t2)+0x80000000);
    else
      return (t1&b);
  else
    if (t2>=0)
      return (a&t2);
    else
      return (a&b);  
}

function or(a,b) {
  a=integer(a);
  b=integer(b);
  var t1=(a-0x80000000);
  var t2=(b-0x80000000);
  if (t1>=0) 
    if (t2>=0) 
      return ((t1|t2)+0x80000000);
    else
      return ((t1|b)+0x80000000);
  else
    if (t2>=0)
      return ((a|t2)+0x80000000);
    else
      return (a|b);  
}

function xor(a,b) {
  a=integer(a);
  b=integer(b);
  var t1=(a-0x80000000);
  var t2=(b-0x80000000);
  if (t1>=0) 
    if (t2>=0) 
      return (t1^t2);
    else
      return ((t1^b)+0x80000000);
  else
    if (t2>=0)
      return ((a^t2)+0x80000000);
    else
      return (a^b);  
}

function not(a) {
  a=integer(a);
  return (0xffffffff-a);
}

/* Here begin the real algorithm */

    var state = new array(4); 
    var count = new array(2);
	count[0] = 0;
	count[1] = 0;                     
    var buffer = new array(64); 
    var transformBuffer = new array(16); 
    var digestBits = new array(16);

    var S11 = 7;
    var S12 = 12;
    var S13 = 17;
    var S14 = 22;
    var S21 = 5;
    var S22 = 9;
    var S23 = 14;
    var S24 = 20;
    var S31 = 4;
    var S32 = 11;
    var S33 = 16;
    var S34 = 23;
    var S41 = 6;
    var S42 = 10;
    var S43 = 15;
    var S44 = 21;

    function F(x,y,z) {
	return or(and(x,y),and(not(x),z));
    }

    function G(x,y,z) {
	return or(and(x,z),and(y,not(z)));
    }

    function H(x,y,z) {
	return xor(xor(x,y),z);
    }

    function I(x,y,z) {
	return xor(y ,or(x , not(z)));
    }

    function rotateLeft(a,n) {
	return or(shl(a, n),(shr(a,(32 - n))));
    }

    function FF(a,b,c,d,x,s,ac) {
        a = a+F(b, c, d) + x + ac;
	a = rotateLeft(a, s);
	a = a+b;
	return a;
    }

    function GG(a,b,c,d,x,s,ac) {
	a = a+G(b, c, d) +x + ac;
	a = rotateLeft(a, s);
	a = a+b;
	return a;
    }

    function HH(a,b,c,d,x,s,ac) {
	a = a+H(b, c, d) + x + ac;
	a = rotateLeft(a, s);
	a = a+b;
	return a;
    }

    function II(a,b,c,d,x,s,ac) {
	a = a+I(b, c, d) + x + ac;
	a = rotateLeft(a, s);
	a = a+b;
	return a;
    }

    function transform(buf,offset) { 
	var a=0, b=0, c=0, d=0; 
	var x = transformBuffer;
	
	a = state[0];
	b = state[1];
	c = state[2];
	d = state[3];
	
	for (i = 0; i < 16; i++) {
	    x[i] = and(buf[i*4+offset],0xff);
	    for (j = 1; j < 4; j++) {
		x[i]+=shl(and(buf[i*4+j+offset] ,0xff), j * 8);
	    }
	}

	/* Round 1 */
	a = FF ( a, b, c, d, x[ 0], S11, 0xd76aa478); /* 1 */
	d = FF ( d, a, b, c, x[ 1], S12, 0xe8c7b756); /* 2 */
	c = FF ( c, d, a, b, x[ 2], S13, 0x242070db); /* 3 */
	b = FF ( b, c, d, a, x[ 3], S14, 0xc1bdceee); /* 4 */
	a = FF ( a, b, c, d, x[ 4], S11, 0xf57c0faf); /* 5 */
	d = FF ( d, a, b, c, x[ 5], S12, 0x4787c62a); /* 6 */
	c = FF ( c, d, a, b, x[ 6], S13, 0xa8304613); /* 7 */
	b = FF ( b, c, d, a, x[ 7], S14, 0xfd469501); /* 8 */
	a = FF ( a, b, c, d, x[ 8], S11, 0x698098d8); /* 9 */
	d = FF ( d, a, b, c, x[ 9], S12, 0x8b44f7af); /* 10 */
	c = FF ( c, d, a, b, x[10], S13, 0xffff5bb1); /* 11 */
	b = FF ( b, c, d, a, x[11], S14, 0x895cd7be); /* 12 */
	a = FF ( a, b, c, d, x[12], S11, 0x6b901122); /* 13 */
	d = FF ( d, a, b, c, x[13], S12, 0xfd987193); /* 14 */
	c = FF ( c, d, a, b, x[14], S13, 0xa679438e); /* 15 */
	b = FF ( b, c, d, a, x[15], S14, 0x49b40821); /* 16 */

	/* Round 2 */
	a = GG ( a, b, c, d, x[ 1], S21, 0xf61e2562); /* 17 */
	d = GG ( d, a, b, c, x[ 6], S22, 0xc040b340); /* 18 */
	c = GG ( c, d, a, b, x[11], S23, 0x265e5a51); /* 19 */
	b = GG ( b, c, d, a, x[ 0], S24, 0xe9b6c7aa); /* 20 */
	a = GG ( a, b, c, d, x[ 5], S21, 0xd62f105d); /* 21 */
	d = GG ( d, a, b, c, x[10], S22,  0x2441453); /* 22 */
	c = GG ( c, d, a, b, x[15], S23, 0xd8a1e681); /* 23 */
	b = GG ( b, c, d, a, x[ 4], S24, 0xe7d3fbc8); /* 24 */
	a = GG ( a, b, c, d, x[ 9], S21, 0x21e1cde6); /* 25 */
	d = GG ( d, a, b, c, x[14], S22, 0xc33707d6); /* 26 */
	c = GG ( c, d, a, b, x[ 3], S23, 0xf4d50d87); /* 27 */
	b = GG ( b, c, d, a, x[ 8], S24, 0x455a14ed); /* 28 */
	a = GG ( a, b, c, d, x[13], S21, 0xa9e3e905); /* 29 */
	d = GG ( d, a, b, c, x[ 2], S22, 0xfcefa3f8); /* 30 */
	c = GG ( c, d, a, b, x[ 7], S23, 0x676f02d9); /* 31 */
	b = GG ( b, c, d, a, x[12], S24, 0x8d2a4c8a); /* 32 */

	/* Round 3 */
	a = HH ( a, b, c, d, x[ 5], S31, 0xfffa3942); /* 33 */
	d = HH ( d, a, b, c, x[ 8], S32, 0x8771f681); /* 34 */
	c = HH ( c, d, a, b, x[11], S33, 0x6d9d6122); /* 35 */
	b = HH ( b, c, d, a, x[14], S34, 0xfde5380c); /* 36 */
	a = HH ( a, b, c, d, x[ 1], S31, 0xa4beea44); /* 37 */
	d = HH ( d, a, b, c, x[ 4], S32, 0x4bdecfa9); /* 38 */
	c = HH ( c, d, a, b, x[ 7], S33, 0xf6bb4b60); /* 39 */
	b = HH ( b, c, d, a, x[10], S34, 0xbebfbc70); /* 40 */
	a = HH ( a, b, c, d, x[13], S31, 0x289b7ec6); /* 41 */
	d = HH ( d, a, b, c, x[ 0], S32, 0xeaa127fa); /* 42 */
	c = HH ( c, d, a, b, x[ 3], S33, 0xd4ef3085); /* 43 */
	b = HH ( b, c, d, a, x[ 6], S34,  0x4881d05); /* 44 */
	a = HH ( a, b, c, d, x[ 9], S31, 0xd9d4d039); /* 45 */
	d = HH ( d, a, b, c, x[12], S32, 0xe6db99e5); /* 46 */
	c = HH ( c, d, a, b, x[15], S33, 0x1fa27cf8); /* 47 */
	b = HH ( b, c, d, a, x[ 2], S34, 0xc4ac5665); /* 48 */

	/* Round 4 */
	a = II ( a, b, c, d, x[ 0], S41, 0xf4292244); /* 49 */
	d = II ( d, a, b, c, x[ 7], S42, 0x432aff97); /* 50 */
	c = II ( c, d, a, b, x[14], S43, 0xab9423a7); /* 51 */
	b = II ( b, c, d, a, x[ 5], S44, 0xfc93a039); /* 52 */
	a = II ( a, b, c, d, x[12], S41, 0x655b59c3); /* 53 */
	d = II ( d, a, b, c, x[ 3], S42, 0x8f0ccc92); /* 54 */
	c = II ( c, d, a, b, x[10], S43, 0xffeff47d); /* 55 */
	b = II ( b, c, d, a, x[ 1], S44, 0x85845dd1); /* 56 */
	a = II ( a, b, c, d, x[ 8], S41, 0x6fa87e4f); /* 57 */
	d = II ( d, a, b, c, x[15], S42, 0xfe2ce6e0); /* 58 */
	c = II ( c, d, a, b, x[ 6], S43, 0xa3014314); /* 59 */
	b = II ( b, c, d, a, x[13], S44, 0x4e0811a1); /* 60 */
	a = II ( a, b, c, d, x[ 4], S41, 0xf7537e82); /* 61 */
	d = II ( d, a, b, c, x[11], S42, 0xbd3af235); /* 62 */
	c = II ( c, d, a, b, x[ 2], S43, 0x2ad7d2bb); /* 63 */
	b = II ( b, c, d, a, x[ 9], S44, 0xeb86d391); /* 64 */

	state[0] +=a;
	state[1] +=b;
	state[2] +=c;
	state[3] +=d;

    }

    function init() {
	count[0]=count[1] = 0;
	state[0] = 0x67452301;
	state[1] = 0xefcdab89;
	state[2] = 0x98badcfe;
	state[3] = 0x10325476;
	for (i = 0; i < digestBits.length; i++)
	    digestBits[i] = 0;
    }

    function update(b) { 
	var index,i;
	
	index = and(shr(count[0],3) , 0x3f);
	if (count[0]<0xffffffff-7) 
	  count[0] += 8;
        else {
	  count[1]++;
	  count[0]-=0xffffffff+1;
          count[0]+=8;
        }
	buffer[index] = and(b,0xff);
	if (index  >= 63) {
	    transform(buffer, 0);
	}
    }

    function finish() {
	var bits = new array(8);
	var	padding; 
	var	i=0, index=0, padLen=0;

	for (i = 0; i < 4; i++) {
	    bits[i] = and(shr(count[0],(i * 8)), 0xff);
	}
        for (i = 0; i < 4; i++) {
	    bits[i+4]=and(shr(count[1],(i * 8)), 0xff);
	}
	index = and(shr(count[0], 3) ,0x3f);
	padLen = (index < 56) ? (56 - index) : (120 - index);
	padding = new array(64); 
	padding[0] = 0x80;
        for (i=0;i<padLen;i++)
	  update(padding[i]);
        for (i=0;i<8;i++) 
	  update(bits[i]);

	for (i = 0; i < 4; i++) {
	    for (j = 0; j < 4; j++) {
		digestBits[i*4+j] = and(shr(state[i], (j * 8)) , 0xff);
	    }
	} 
    }

/* End of the MD5 algorithm */

function hexa(n) {
 var hexa_h = "0123456789abcdef";
 var hexa_c=""; 
 var hexa_m=n;
 for (hexa_i=0;hexa_i<8;hexa_i++) {
   hexa_c=hexa_h.charAt(Math.abs(hexa_m)%16)+hexa_c;
   hexa_m=Math.floor(hexa_m/16);
 }
 return hexa_c;
}


var ascii="01234567890123456789012345678901" +
          " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ"+
          "[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

function MD5(entree) 
{
 var l,s,k,ka,kb,kc,kd;

 init();
 for (k=0;k<entree.length;k++) {
   l=entree.charAt(k);
   update(ascii.lastIndexOf(l));
 }
 finish();
 ka=kb=kc=kd=0;
 for (i=0;i<4;i++) ka+=shl(digestBits[15-i], (i*8));
 for (i=4;i<8;i++) kb+=shl(digestBits[15-i], ((i-4)*8));
 for (i=8;i<12;i++) kc+=shl(digestBits[15-i], ((i-8)*8));
 for (i=12;i<16;i++) kd+=shl(digestBits[15-i], ((i-12)*8));
 s=hexa(kd)+hexa(kc)+hexa(kb)+hexa(ka);
 return s; 
}

/* This implement the MD5 test suite */
var testOk=false;
function teste() {
 if (testOk) return;
 document.test.o1.value=MD5(document.test.i1.value);
 document.test.o2.value=MD5(document.test.i2.value);
 document.test.o3.value=MD5(document.test.i3.value);
 document.test.o4.value=MD5(document.test.i4.value);
 document.test.o5.value=MD5(document.test.i5.value);
 document.test.o6.value=MD5(document.test.i6.value);
 document.test.o7.value=MD5(document.test.i7.value);
 testOk=true;
}


/* file-end: js/md5.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/thread_expander.js 
*/

Expander = function(){
    this.__caller__;    // <a> HTML element from where Expander was called
    this.url;           // full url of thread to be expanded
    this.id;            // id of the thread
    this.stored_caller;
    this.iframe;        // iframe, where the thread will be loaded
    this.is_S1;         // bool flag, true == journal is in S1, false == in S2
}
Expander.Collection={};
Expander.make = function(el,url,id,is_S1){
    var local = (new Expander).set({__caller__:el,url:url.replace(/#.*$/,''),id:id,is_S1:!!is_S1});
    local.get();
}

Expander.prototype.set = function(options){
    for(var opt in options){
        this[opt] = options[opt];
    }
    return this;
}

Expander.prototype.getCanvas = function(id,context){
    return context.document.getElementById('ljcmt'+id);
}

Expander.prototype.parseLJ_cmtinfo = function(context,callback){
    var map={}, node, j;
    var LJ = context.LJ_cmtinfo;
    if(!LJ)return false;
    for(j in LJ){
        if(/^\d*$/.test(j) && (node = this.getCanvas(j,context))){
            map[j] = {info:LJ[j],canvas:node};
            if(typeof callback == 'function'){
                callback(j,map[j]);
            }
        }
    }
    return map;
}

Expander.prototype.loadingStateOn = function(){
    this.stored_caller = this.__caller__.cloneNode(true);
    this.__caller__.setAttribute('already_clicked','already_clicked');
    this.__caller__.onclick = function(){return false}
    this.__caller__.style.color = '#ccc';
}

Expander.prototype.loadingStateOff = function(){
    if(this.__caller__){
        // actually, the <a> element is removed from main window by
        // copying comment from ifame, so this code is not executed (?)
        this.__caller__.removeAttribute('already_clicked','already_clicked');
        if(this.__caller__.parentNode) this.__caller__.parentNode.replaceChild(this.stored_caller,this.__caller__);
    }
    var obj = this;
    // When frame is removed immediately, IE raises an error sometimes
    window.setTimeout(function(){obj.killFrame()},100);
}

Expander.prototype.killFrame = function(){
    document.body.removeChild(this.iframe);
}

Expander.prototype.isFullComment = function(comment){
    return !!Number(comment.info.full);
}

Expander.prototype.killDuplicate = function(comments){
    var comment;
    var id,id_,el,el_;
    for(var j in comments){
        if(!/^\d*$/.test(j))continue;
        el_ = comments[j].canvas;
        id_ = el_.id;
        id = id_.replace(/_$/,'');
        el = document.getElementById(id);
        if(el!=null){
            //in case we have a duplicate;
            el_.parentNode.removeChild(el_);
        }else{
            el_.id = id;
            window.ContextualPopup && ContextualPopup.searchAndAdd(el_);
            window.setupAjax && setupAjax(el_);
            window.ESN && ESN.initTrackBtns(el_);
        }
    }
}

Expander.prototype.getS1width = function(canvas){
  //TODO:  may be we should should add somie ID to the spacer img instead of searching it
  //yet, this works until we have not changed the spacers url = 'dot.gif');
  var img, imgs;
  imgs = canvas.getElementsByTagName('img');
  for(var j=0;j<imgs.length;j++){
    img=imgs[j];
    if(/dot\.gif$/.test(img.src)){
        if (img.width) { return Number(img.width); }
        break;
    }
  }
  return false;
}

Expander.prototype.setS1width = function(canvas,w){
  var img, imgs;
  imgs = canvas.getElementsByTagName('img');
  for(var j=0;j<imgs.length;j++){
    img=imgs[j];
    if(/dot\.gif$/.test(img.src)){
        img.setAttribute('width',w);
        break;
    }
  }
}

Expander.prototype.onLoadHandler = function(iframe){
        var doc = iframe.contentDocument || iframe.contentWindow;
        doc = doc.document||doc;
        var obj = this;
        var win = doc.defaultView||doc.parentWindow;
        var comments_intersection={};
        var comments_page = this.parseLJ_cmtinfo(window);
        var comments_iframe = this.parseLJ_cmtinfo(win,function(id,new_comment){
                                    if(id in comments_page){
                                        comments_page[id].canvas.id = comments_page[id].canvas.id+'_';
                                        comments_intersection[id] = comments_page[id];
                                        // copy comment from iframe to main window if
                                        // 1) the comment is collapsed in main window and is full in iframe
                                        // 2) or this is the root comment of this thread (it may be full in
                                        //     main window too, it's copied so that to remove "expand" link from it)
                                        if((!obj.isFullComment(comments_page[id]) && obj.isFullComment(new_comment)) || (id===obj.id)){
                                            var w;
                                            if(obj.is_S1){
                                                w =obj.getS1width(comments_page[id].canvas);
                                            }
                                            comments_page[id].canvas.innerHTML = new_comment.canvas.innerHTML;
                                            if(obj.is_S1 && w!==false){
                                                    obj.setS1width(comments_page[id].canvas,w);
                                            }
                                            //TODO: may be this should be uncommented
                                            //comments_page[id].canvas.className = new_comment.canvas.className;
                                            LJ_cmtinfo[id].full=1;
                                            LJ_cmtinfo[id].expanded=1;
                                        }
                                    }//if(id in comments_page){
                                });
       this.killDuplicate(comments_intersection);
       this.loadingStateOff();
       return true;
}


//just for debugging
Expander.prototype.toString = function(){
    return '__'+this.id+'__';
}


Expander.prototype.get = function(){
    if(this.__caller__.getAttribute('already_clicked')){
        return false;
    }
    this.loadingStateOn();

    var iframe;
    if(/*@cc_on !@*/0){
        // branch for IE
        Expander.Collection[this.id] = this;
        iframe = document.createElement('<iframe onload="Expander.Collection['+this.id+'].onLoadHandler(this)">');
    }else{
        // branch for all other browsers
        iframe = document.createElement('iframe');
        iframe.onload = function(obj){return function(){
                            obj.onLoadHandler(iframe);
                        }}(this);
    }
    iframe.style.height='1px';
    iframe.style.width='1px';
    iframe.style.display = 'none';
    iframe.src = this.url;
    iframe.id = this.id;
    document.body.appendChild(iframe);
    this.iframe=iframe;
    return true;
};


/* file-end: js/thread_expander.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/thread_expander.ex.js 
*/

/*
 * ExpanderEx object is used in s1 style comment pages and provides
 * ajax functionality to expand comments instead of loading iframe page as it is
 * in old Expander
 * expander object is also used in commentmanage.js
 */
ExpanderEx = function(){
    this.__caller__;    // <a> HTML element from where ExpanderEx was called
    this.url;           // full url of thread to be expanded
    this.id;            // id of the thread
    this.stored_caller;
    this.is_S1;         // bool flag, true == journal is in S1, false == in S2
}
ExpanderEx.Collection={};
ExpanderEx.ReqCache = {};

ExpanderEx.make = function(ev,el,url,id,is_S1){
    var local = (new ExpanderEx).set({__caller__:el,url:url.replace(/#.*$/,''),id:id,is_S1:!!is_S1});
    local.get();
    jQuery.event.fix(ev).preventDefault();
}

ExpanderEx.collapse = function(ev,el,url,id,is_S1){
    var local = (new ExpanderEx).set({__caller__:el,url:url.replace(/#.*$/,''),id:id,is_S1:!!is_S1});
    local.collapseThread();
    jQuery.event.fix(ev).preventDefault();
}

ExpanderEx.prototype.set = function(options){
    for(var opt in options){
        this[opt] = options[opt];
    }
    return this;
}

ExpanderEx.prototype.getCanvas = function(id,context){
    return context.document.getElementById('ljcmt'+id);
}

ExpanderEx.prototype.parseLJ_cmtinfo = function(context,callback){
    var map={}, node, j;
    var LJ = context.LJ_cmtinfo;
    if(!LJ)return false;
    for(j in LJ){
        if(/^\d*$/.test(j) && (node = this.getCanvas(j,context))){
            map[j] = {info:LJ[j],canvas:node};
            if(typeof callback == 'function'){
                callback(j,map[j]);
            }
        }
    }
    return map;
}

ExpanderEx.preloadImg = function(){
    (new Image()).src = Site.imgprefix + '/preloader-s.gif?v=9673';
}

ExpanderEx.prototype.addPreloader = function(){
    this.loader = new Image();
    this.loader.src = Site.imgprefix + '/preloader-s.gif?v=9673';
    this.loader.className = 'i-exp-preloader';
    this.__caller__.parentNode.appendChild( this.loader );
}

ExpanderEx.prototype.removePreloader = function(){
    if( !this.loader ){
        return;
    }

    if( this.loader.parentNode ){
        this.loader.parentNode.removeChild( this.loader );
    }
    delete this.loader;
};

ExpanderEx.prototype.loadingStateOn = function(){
    // turn on preloader there
    this.addPreloader();
    this.stored_caller = this.__caller__.cloneNode(true);
    this.__caller__.setAttribute('already_clicked','already_clicked');
    this.__caller__.onclick = function(){return false}
    this.__caller__.style.color = '#ccc';
}

ExpanderEx.prototype.loadingStateOff = function(){
    if(this.__caller__){
        // actually, the <a> element is removed from main window by
        // copying comment from ifame, so this code is not executed (?)
        this.__caller__.removeAttribute('already_clicked','already_clicked');
        if(this.__caller__.parentNode) this.__caller__.parentNode.replaceChild(this.stored_caller,this.__caller__);
        //remove preloader if exist
        this.removePreloader();
    }
    var obj = this;
    // When frame is removed immediately, IE raises an error sometimes
}

ExpanderEx.prototype.killFrame = function(){
    document.body.removeChild(this.iframe);
}

ExpanderEx.prototype.isFullComment = function( comment ) {
    return !!Number(comment.info.full);
}

ExpanderEx.prototype.expandThread = function( json ) {
    this.loadingStateOff();

    //we show expand link if comment block has collapsed children
    function isChildCollapsed( idx )
    {
        var state;
        for( var i = idx + 1; i < json.length; ++i ) {
            state = json[ i ].state;
            if( state === "expanded" ) { return false; }
            if( state === "collapsed" ) { return true; }
        }

        return  false;
    }

    var threadId, cell, html;
    for( var i = 0; i < json.length; ++i ) {
        //we skip comment blocks thate were not expanded
        if( json[ i ].state === 'deleted' ) {
            LJ_cmtinfo[ json[ i ].thread ].is_deleted = true;
        }
		if( !( json[ i ].thread in LJ_cmtinfo ) ) {
			continue;
		}
        if( json[ i ].state && json[ i ].state !== "expanded") {
            continue;
        }

        threadId = json[ i ].thread;
        html = ExpanderEx.prepareCommentBlock( jQuery( json[ i ].html ), threadId, isChildCollapsed( i ) );

        var oldHtml = LiveJournal.CommentManager.updateCell( threadId, html );
        if( !( threadId in ExpanderEx.Collection ) ) {
            ExpanderEx.Collection[ threadId ] = oldHtml;
        }
    }

    //duplicate cycle, because we do not know, that external scripts do with node
    for( var i = 0; i < json.length; ++i ) {
        threadId = json[ i ].thread;
        LJ_cmtinfo[ threadId ].parent = this.id;
        if( json[ i ].state && json[ i ].state === "expanded") {
            this.initCommentBlock( jQuery( '#ljcmt' + threadId )[0] , threadId );
        }
    }

    return true;
}

ExpanderEx.prototype.collapseThread = function( id ){
    var threadId = id || this.id;
    this.collapseBlock( threadId );

    var children = LJ_cmtinfo[ threadId ].rc;
    for( var i = 0; i < children.length; ++i )
        this.collapseThread( children[ i ] );
}

ExpanderEx.prototype.collapseBlock =  function( id )
{
	if( id in ExpanderEx.Collection ) {
		LiveJournal.CommentManager.updateCell( id, ExpanderEx.Collection[ id ] );

		this.initCommentBlock( LiveJournal.CommentManager.getCell( id )[0], id, true );
		delete ExpanderEx.Collection[ id ];
	}
}

ExpanderEx.prototype.initCommentBlock = function( el_, id, restoreInitState )
{
    if( !restoreInitState ){
        LJ_cmtinfo[ id ].oldvars = {
            full: LJ_cmtinfo[ id ].full || 0,
            expanded: LJ_cmtinfo[ id ].expanded || 0
        }
        LJ_cmtinfo[ id ].full = 1;
        LJ_cmtinfo[ id ].expanded = 1;
    }
    else {
        LJ_cmtinfo[ id ].full = LJ_cmtinfo[ id ].oldvars.full;
        LJ_cmtinfo[ id ].expanded = LJ_cmtinfo[ id ].oldvars.expanded;
        delete LJ_cmtinfo[ id ].oldvars;
    }
    window.ContextualPopup && ContextualPopup.searchAndAdd(el_);
    //window.setupAjax && setupAjax(el_, true);
    window.ESN && ESN.initTrackBtns(el_);
}


//just for debugging
ExpanderEx.prototype.toString = function(){
    return '__'+this.id+'__';
}


ExpanderEx.prototype.get = function(){
    if(this.__caller__.getAttribute('already_clicked')){
        return false;
    }
    this.loadingStateOn();

    var obj = this;
    //set timeout to allow browser to display image before request
    setTimeout( function(){
        LiveJournal.CommentManager.getThreadJSON( obj.id, function(result) {
            obj.expandThread(result);
            ExpanderEx.ReqCache[ obj.id ] = result;
        }, false, false, true );
    }, 0 );

    return true;
}

//toggle visibility of expand and collapse links, if server returns
//html with both of them ( with every ajax request)
ExpanderEx.prepareCommentBlock = function(html, id, showExpand){
    this.showExpandLink( id, html, showExpand );
    return html;
}

ExpanderEx.showExpandLink = function ( id, block, showExpand ) {
    var expandSel = "#expand_" + id,
        collapseSel = "#collapse_" + id,
        selector, resetSelector;

    if( LJ_cmtinfo[ id ].has_link > 0 ) {
        if( showExpand ) {
            selector = collapseSel;
            resetSelector = expandSel;
        } else {
            selector = expandSel;
            resetSelector = collapseSel;
        }
        block.find( resetSelector ).css( 'display', '' );
    }
    else {
        selector = collapseSel + "," + expandSel;
    }

    block.find( selector )
        .css( 'display', 'none' );
}

ExpanderEx.preloadImg();


/* file-end: js/thread_expander.ex.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/commentmanage.js 
*/

// called by S2:
function setStyle (did, attr, val) {
    if (! document.getElementById) return;
    var de = document.getElementById(did);
    if (! de) return;
    if (de.style)
        de.style[attr] = val
}

// called by S2:
function setInner (did, val) {
    if (! document.getElementById) return;
    var de = document.getElementById(did);
    if (! de) return;
    de.innerHTML = val;
}

// called by S2:
function hideElement (did) {
    if (! document.getElementById) return;
    var de = document.getElementById(did);
    if (! de) return;
    de.style.display = 'none';
}

// called by S2:
function setAttr (did, attr, classname) {
    if (! document.getElementById) return;
    var de = document.getElementById(did);
    if (! de) return;
    de.setAttribute(attr, classname);
}

// called from Page:
function multiformSubmit (form, txt) {
    var sel_val = form.mode.value;
    if (!sel_val) {
        alert(txt.no_action);
        return false;
    }

    if (sel_val.substring(0, 4) == 'all:') { // mass action
        return;
    }

    var i = -1, has_selected = false; // at least one checkbox
    while (form[++i]) {
        if (form[i].name.substring(0, 9) == 'selected_' && form[i].checked) {
            has_selected = true;
            break;
        }
    }
    if (!has_selected) {
        alert(txt.no_comments);
        return false;
    }

    if (sel_val == 'delete' || sel_val == 'deletespam') {
        return confirm(txt.conf_delete);
    }
}

function getLocalizedStr( key, username ) {
    return LiveJournal.getLocalizedStr( key, { username: username } );
}

// hsv to rgb
// h, s, v = [0, 1), [0, 1], [0, 1]
// r, g, b = [0, 255], [0, 255], [0, 255]
function hsv_to_rgb (h, s, v)
{
    if (s == 0) {
	v *= 255;
	return [v,v,v];
    }

    h *= 6;
    var i = Math.floor(h);
    var f = h - i;
    var p = v * (1 - s);
    var q = v * (1 - s * f);
    var t = v * (1 - s * (1 - f));

    v = Math.floor(v * 255 + 0.5);
    t = Math.floor(t * 255 + 0.5);
    p = Math.floor(p * 255 + 0.5);
    q = Math.floor(q * 255 + 0.5);

    if (i == 0) return [v,t,p];
    if (i == 1) return [q,v,p];
    if (i == 2) return [p,v,t];
    if (i == 3) return [p,q,v];
    if (i == 4) return [t,p,v];
    return [v,p,q];
}

function deleteComment (ditemid, action) {
	action = action || 'delete';
	
	var curJournal = (Site.currentJournal !== "") ? (Site.currentJournal) : (LJ_cmtinfo.journal);

    var form = $('ljdelopts' + ditemid),
        todel = $('ljcmt' + ditemid),
        opt_delthread, opt_delauthor, is_deleted, is_error,
        pulse = 0,
		url = LiveJournal.getAjaxUrl('delcomment')+'?mode=js&journal=' + curJournal + '&id=' + ditemid;
    
	var postdata = 'confirm=1';
    if (form && action == 'delete') { 
    	if (form.ban && form.ban.checked) {
			postdata += '&ban=1';
		}
    	if (form.spam && form.spam.checked) {
			postdata += '&spam=1';
		}
    	if (form.delthread && form.delthread.checked) {
			postdata += '&delthread=1';
			opt_delthread = true;
		}
    	if (form.delauthor && form.delauthor.checked) {
        	postdata += '&delauthor=1';
        	opt_delauthor = true;
    	}
    } else if (action == 'markAsSpam') {
		opt_delauthor = opt_delthread = true;
		postdata += '&ban=1&spam=1&delauthor=1';
	}
	
    postdata += '&lj_form_auth=' + decodeURIComponent(LJ_cmtinfo.form_auth);

    var opts = {
        url: url,
        data: postdata,
        method: 'POST',
        onData: function(data) {
            is_deleted = !!data;
            is_error = !is_deleted;
        },
        onError: function() {
          alert('Error deleting ' + ditemid);
          is_error = true;
        }
    };

	HTTPReq.getJSON(opts);


    var flash = function () {
        var rgb = hsv_to_rgb(0, Math.cos((pulse + 1) / 2), 1);
        pulse += 3.14159 / 5;
        var color = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";

        todel.style.border = "2px solid " + color;
        if (is_error) {
            todel.style.border = "";
            // and let timer expire
        } else if (is_deleted) {
			removeComment(ditemid, opt_delthread);
            if (opt_delauthor && LJ_cmtinfo[ditemid].u !== '') {
                for (var item in LJ_cmtinfo) {
					if ( LJ_cmtinfo[item].u == LJ_cmtinfo[ditemid].u
						&& !LJ_cmtinfo[ item ].is_deleted) {
						removeComment(item, false);
                    }
                }
            }
        } else {
            window.setTimeout(flash, 50);
        }
    };

    window.setTimeout(flash, 5);
}

function removeComment (ditemid, killChildren) {
	if( LiveJournal.CommentManager.getState() !== 'iframe'){
		var threadId = ditemid;

		LiveJournal.CommentManager.getThreadJSON(threadId, function(result) {
			LiveJournal.CommentManager.processThreadJSON( result, function( dtid, html, comment) {
				if (LJ_cmtinfo[ threadId ].u !== LJ_cmtinfo[ dtid ].u) {
					return;
				}

				html = ExpanderEx.prepareCommentBlock( html, dtid ); //, isChildCollapsed( i ) );
				LiveJournal.CommentManager.updateCell( dtid, html );
				if( comment.is_deleted && ( dtid in ExpanderEx.Collection ) ) {
					delete ExpanderEx.Collection[ dtid ];
				}
			} );
		}, true );
	}
	else {
		var todel = document.getElementById("ljcmt" + ditemid);
		if (todel) {
			todel.style.display = 'none';

			var userhook = window["userhook_delete_comment_ARG"];
			if (userhook)
				userhook(ditemid);
		}
	}
	if (killChildren) {
		var com = LJ_cmtinfo[ditemid];
		for (var i = 0; i < com.rc.length; i++) {
			removeComment(com.rc[i], true);
		}
	}
}

function createDeleteFunction(ae, dItemid, action) {
	action = action || 'delete';
	
    return function (e) {
		e = jQuery.event.fix(e || window.event);
		
		e.stopPropagation();
		e.preventDefault();

        var doIT = 0;
        // immediately delete on shift key
        if (e.shiftKey) {
			doIT = 1;
			deleteComment(dItemid, action);
			return true;
		}
		
		if (!LJ_cmtinfo) {
			return true;
		}

        var com = LJ_cmtinfo[dItemid],
			comUser = LJ_cmtinfo[dItemid].u,
			remoteUser = LJ_cmtinfo.remote;
        if (!com || !remoteUser) {
			return true;
		}
        var canAdmin = LJ_cmtinfo.canAdmin;
		
		var markSpamMLPrefix = (Site.remote_is_maintainer == 1 && com.u !== '') ? 'comment.mark.spam.' : 'comment.mark.spam2.';		
		
		if (action == 'markAsSpam') {
			if (!window.ctrlPopup) {
				window.ctrlPopup = jQuery('<div class="b-popup-ctrlcomm" />')
					.delegate('input.spam-comment-button', 'click', function () {
						window.ctrlPopup.bubble('hide');
					});
			}			

			window.ctrlPopup
				.html('<div class="b-popup-group"><div class="b-popup-row b-popup-row-head"><strong>' + getLocalizedStr(markSpamMLPrefix + 'title', comUser) + '</strong></div><div class="b-popup-row">' + getLocalizedStr(markSpamMLPrefix + 'subject', comUser) + '</div><div class="b-popup-row"><input type="button" class="spam-comment-button" onclick="deleteComment(' + dItemid + ', \'' + action + '\');" value="' + getLocalizedStr(markSpamMLPrefix + 'button', comUser) + '"></div><div>', ae, e, 'spamComment' + dItemid)
				.bubble()
				.bubble('show', ae);

			return true;
		} else if (action == 'delete') {
			var inHTML = [ "<form id='ljdelopts" + dItemid + "'><div class='b-popup-group'><div class='b-popup-row b-popup-row-head'><strong>" + getLocalizedStr( 'comment.delete.q', comUser ) + "</strong></div>" ];
			var lbl;
			if (com.username !== "" && com.username != remoteUser && canAdmin) {
				lbl = "ljpopdel" + dItemid + "ban";
				inHTML.push("<div class='b-popup-row'><input type='checkbox' name='ban' id='" + lbl + "'> <label for='" + lbl + "'>" + getLocalizedStr( 'comment.ban.user', comUser ) + "</label></div>");
			}

			if (com.rc && com.rc.length && canAdmin) {
				lbl = "ljpopdel" + dItemid + "thread";
				inHTML.push("<div class='b-popup-row'><input type='checkbox' name='delthread' id='" + lbl + "'> <label for='" + lbl + "'>" + getLocalizedStr( 'comment.delete.all.sub', comUser ) + "</label></div>");
			}
			if (canAdmin&&com.username) {
				lbl = "ljpopdel" + dItemid + "author";
				inHTML.push("<div class='b-popup-row'><input type='checkbox' name='delauthor' id='" + lbl + "'> <label for='" + lbl + "'>" +
						(com.username == remoteUser ? getLocalizedStr( 'comment.delete.all.my') :
						getLocalizedStr( 'comment.delete.all', "<b>" + comUser + "</b>" )) + "</label></div>");
			}

			inHTML.push("<div class='b-popup-row'><input class='delete-comment-button' type='button' value='" + getLocalizedStr( 'comment.delete', comUser ) + "' onclick='deleteComment(" + dItemid + ");' /></div></div><div class='b-bubble b-bubble-alert b-bubble-noarrow'><i class='i-bubble-arrow-border'></i><i class='i-bubble-arrow'></i>" + getLocalizedStr( 'comment.delete.no.options', comUser ) + "</div></form>");
			
			if (!window.delPopup) {
				window.delPopup = jQuery('<div class="b-popup-delcomm" />')
					.delegate('input.delete-comment-button', 'click', function () {
						window.delPopup.bubble('hide');
					});
			}
			
			window.delPopup
				.html(inHTML.join(' '))
				.bubble()
				.bubble('show', ae);
				
		} else if (action == 'unspam') {
			deleteComment(dItemid, action);
		}
	};
}

function poofAt (pos) {
    var de = document.createElement("div");
    de.style.position = "absolute";
    de.style.background = "#FFF";
    de.style.overflow = "hidden";
    var opp = 1.0;

    var top = pos.y;
    var left = pos.x;
    var width = 5;
    var height = 5;
    document.body.appendChild(de);

    var fade = function () {
        opp -= 0.15;
        width += 10;
        height += 10;
        top -= 5;
        left -= 5;

        if (opp <= 0.1) {
            de.parentNode.removeChild(de);
        } else {
            de.style.left = left + "px";
            de.style.top = top + "px";
            de.style.height = height + "px";
            de.style.width = width + "px";
            de.style.filter = "alpha(opacity=" + Math.floor(opp * 100) + ")";
            de.style.opacity = opp;
            window.setTimeout(fade, 20);
        }
    };
    fade();
}

function updateLink (ae, resObj, clickTarget) {
    ae.href = resObj.newurl;
    var userhook = window["userhook_" + resObj.mode + "_comment_ARG"];
    var did_something = 0;

    if (clickTarget && clickTarget.src && clickTarget.src == resObj.oldimage) {
        clickTarget.src = resObj.newimage;
        did_something = 1;
    }

    if (userhook) {
        userhook(resObj.id);
        did_something = 1;
    }

    // if all else fails, at least remove the link so they're not as confused
    if (! did_something) {
        if (ae && ae.style)
            ae.style.display = 'none';
        if (clickTarget && clickTarget.style)
            clickTarget.style.dispay = 'none';
    }

}

var tsInProg = {}  // dict of { ditemid => 1 }
function createModerationFunction(control, dItemid, action) {
	var action = action || 'screen',
		comUser = LJ_cmtinfo[dItemid].u;	
	
	return function (e) {
		var	e = jQuery.event.fix(e || window.event),
			pos = { x: e.pageX, y: e.pageY },
			modeParam = LiveJournal.parseGetArgs(location.href).mode,
			hourglass;
			
		e.stopPropagation();
		e.preventDefault();
			
		sendModerateRequest();

		function sendModerateRequest() {
			var	bmlName = (action == 'unspam') ? 'spamcomment' : 'talkscreen',
				postUrl = control.href.replace(new RegExp('.+' + bmlName + '\.bml'), LiveJournal.getAjaxUrl(bmlName)),
				postParams = { 'confirm': 'Y', lj_form_auth: decodeURIComponent(LJ_cmtinfo.form_auth) };
				
			if (action == 'unspam') {
				postUrl += '&jsmode=1';
			}
				
			hourglass = jQuery(e).hourglass()[0];
			
			jQuery.post(postUrl, postParams, function (json) {
				tsInProg[dItemid] = 0;
				
				if (action == 'unspam') {
					json = jQuery.parseJSON(json); 
					
					if (json.result) {
						removeEmptyMarkup(dItemid);
						hourglass.hide();
						return true;
					} else {
						alert(json.errormsg);
					}
				}
				
				if( LiveJournal.CommentManager.getState() !== 'iframe' ) {
					handleNew();
				} else {
					var ids = checkRcForNoCommentsPage();
					handleIframe(ids);
				}
			});
		}

		function handleNew() {
			var newNode, showExpand, j, children,
				threadId = dItemid,
				threadExpanded = !!(LJ_cmtinfo[ threadId ].oldvars && LJ_cmtinfo[ threadId ].full),
				populateComments = function (result) {
					LiveJournal.CommentManager.processThreadJSON( result, function( dtid, html ) {
						if( LJ_cmtinfo[ dtid ].full ){
							showExpand = !( 'oldvars' in LJ_cmtinfo[ dtid ]);
	
							//still show expand button if children comments are folded
							if( !showExpand ) {
								children  = LJ_cmtinfo[ dtid ].rc;
	
								for( j = 0; j < children.length;  ++j ) {
									if( !LJ_cmtinfo[ children[j] ].full && !LJ_cmtinfo[ children[j] ].is_deleted ) {
									// if( !( 'oldvars' in LJ_cmtinfo[ children[j] ] ) ) {
										showExpand = true;
									}
								}
							}
							
							if (!html) {
								removeEmptyMarkup(result[i].thread);
							}

							var newNode = ExpanderEx.prepareCommentBlock( html, dtid, showExpand );
	
							LiveJournal.CommentManager.updateCell( dtid, newNode );
						}
					} );
					hourglass.hide();
					poofAt(pos);
				};
	
			LiveJournal.CommentManager.getThreadJSON(threadId, function (result) {
				//if comment is expanded we need to fetch it's collapsed state additionally
				if( threadExpanded && LJ_cmtinfo[ threadId ].oldvars.full )
				{
					LiveJournal.CommentManager.getThreadJSON( threadId, function (result2) {
						ExpanderEx.Collection[ threadId ] = ExpanderEx.prepareCommentBlock( jQuery( "<div>" + result2[0].html + "</div>" ), threadId, true ).html()
						//ExpanderEx.Collection[ threadId ] = result2[0].html;
						populateComments( result );
					}, true, true );
				}
				else {
					populateComments( result );
				}
			}, false, !threadExpanded);
		}

		function handleIframe(ids) {
			// modified jQuery.fn.load
			jQuery.ajax({
				url: location.href,
				type: 'GET',
				dataType: 'html',
				complete: function (res, status) {
					// If successful, inject the HTML into all the matched elements
					if (status == 'success' || status == 'notmodified') {
						// Create a dummy div to hold the results
						var nodes = jQuery('<div/>')
							// inject the contents of the document in, removing the scripts
							// to avoid any 'Permission Denied' errors in IE
							.append(res.responseText.replace(/<script(.|\s)*?\/script>/gi, ''))
							// Locate the specified elements
							.find(ids)
							.each(function () {
								var id = this.id.replace(/[^0-9]/g, '');
								if (LJ_cmtinfo[id].expanded) {
									var expand = this.innerHTML.match(/Expander\.make\(.+?\)/)[0];
									(function(){
										eval(expand);
									}).apply(document.createElement('a'));
								} else {
									jQuery('#' + this.id).replaceWith(this);
								}
							});
						hourglass.hide();
						poofAt(pos);
					}
				}
			});
		}

		function checkRcForNoCommentsPage() {
			var commsArray = [ dItemid ], ids;

			// check rc for no comments page
			if (LJ_cmtinfo[dItemid].rc) {
				if (/mode=(un)?freeze/.test(control.href)) {
					mapComms(dItemid);
				}
				ids = '#ljcmt' + commsArray.join(',#ljcmt');
			} else {
				var rpcRes;
				eval(json);
				updateLink(control, rpcRes, control.getElementsByTagName('img')[0]);
				// /tools/recent_comments.bml
				if (document.getElementById('ljcmtbar'+dItemid)) {
					ids = '#ljcmtbar' + dItemid;
				}
				// ex.: portal/
				else {
					hourglass.hide();
					poofAt(pos);
					return;
				}
			}
			
			
			function mapComms(id) {
				var i = -1, newId;
				
				while (newId = LJ_cmtinfo[id].rc[++i]) {
					if (LJ_cmtinfo[newId].full) {
						commsArray.push(newId);
						mapComms(String(newId));
					}
				}
			}
			
			return ids;
		}
		
		return false;
	}
}

function removeEmptyMarkup(threadId) {
	jQuery('#ljcmt' + threadId).remove();
}

(function( $, window ) {

	window.LiveJournal.CommentManager = function() {
		this.bindLinks();
	}

	LiveJournal.CommentManager.prototype.bindLinks = function() {
		$( 'body' ).delegate( 'a', 'click', function( ev ) {
			var rex_id = /id=(\d+)/, ae = this;

		if (ae.href.indexOf('talkscreen.bml') != -1) {
			var reMatch = rex_id.exec(ae.href);
			if (!reMatch) return;

			var id = reMatch[1];
			if (!document.getElementById('ljcmt' + id)) return;

			createModerationFunction(ae, id)( ev );
		} else if (ae.href.indexOf('delcomment.bml') != -1) {
			if (LJ_cmtinfo && LJ_cmtinfo.disableInlineDelete) return;

			var reMatch = rex_id.exec(ae.href);
			if (!reMatch) return;

			var id = reMatch[1];
			if (!document.getElementById('ljcmt' + id)) return;

			var action = (ae.href.indexOf('spam=1') != -1) ? 'markAsSpam' : 'delete';

			createDeleteFunction(ae, id, action)( ev );
		// unspam
		} else if (ae.href.indexOf('spamcomment.bml') != -1) {
			var reMatch = rex_id.exec(ae.href);
			if (!reMatch) return;

			var id = reMatch[1];
			if (!document.getElementById('ljcmt' + id)) return;
			createModerationFunction(ae, id, 'unspam')( ev );
		} else {
			return;
		}

			ev.preventDefault();
			ev.stopPropagation();
		} );
	}

	var manager = window.LiveJournal.CommentManager;

	window.LiveJournal.CommentManager.getState = function() {
		if( LJ_cmtinfo.use_old_thread_expander ) {
			return "iframe";
		} else {
			return "old";
		}
	}

	/**
	 * @param {Number} threadId Id of thread to update
	 * @param {Node} node Collection of nodes with new content
	 *
	 * @return {String} Returns a string containing old content of the cell;
	 */
	LiveJournal.CommentManager.updateCell = function( threadId, node ) {
		var cell = $( "#ljcmt" + threadId ),
			old_html = $( '<div></div>' ). append( cell.clone() );

		cell.replaceWith( $( node ).filter( "#ljcmt" + threadId ) );

		return old_html.html();
	}

	LiveJournal.CommentManager.getCell = function( threadId ) {
		return $( "#ljcmt" + threadId );
	}

	LiveJournal.CommentManager.getThreadJSON = function(threadId, success, getSingle)
	{
		var postid = location.href.match(/\/(\d+).html/)[1],
			modeParam = LiveJournal.parseGetArgs(location.href).mode,
			params = {
				journal: Site.currentJournal,
				itemid: postid,
				thread: threadId,
				depth: LJ_cmtinfo[ threadId ].depth
			};

		if( getSingle) {
			params.single = '1';
		}

		if (modeParam) {
			params.mode = modeParam;
		}

		var getArgs = LiveJournal.parseGetArgs( location.href );
		if( getArgs && !!getArgs.style && getArgs.style === "mine" ) {
			params.style = "mine";
		}

		var endpoint = LiveJournal.getAjaxUrl( 'get_thread' );
		jQuery.get( LiveJournal.constructUrl( endpoint, params ), success, 'json' );
	}

	LiveJournal.CommentManager.processThreadJSON = function( result, callback ) {
		var comment, dom;
		for( var i = 0; i < result.length; ++i ){
			if( !( result[ i ].thread in LJ_cmtinfo ) ) {
				continue;
			}
	
			comment = {};
			comment.is_deleted = ( result[i].state === "deleted" );
			if( comment.is_deleted ) {
				LJ_cmtinfo[ result[i].thread ].is_deleted = true;
			}
			dom = $( result[i].html ).filter( "#ljcmt" + result[i].thread );
			callback( result[i].thread, dom, comment );
		}
	}

	$( function() { new LiveJournal.CommentManager(); } );

}( jQuery, window ))

function LJ_Mul( a, b ) { return parseInt(a, 10) * parseInt(b, 10) }

function LJ_JoinURL( url /* parts */ ) {
	var add = [].slice.call( arguments, 1 ).join( '&' );

	url += ( url.indexOf( '?' ) > -1 ) ? '&' : '?';
	return url + add;
}

function LJ_Concat( /* parts */ ) {
	return [].slice.call( arguments, 0 ).join( '' );
}


/* file-end: js/commentmanage.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/jquery/jquery.lj.journalPromoStrip.js 
*/

/**
 * @name $.lj.journalPromoStrip
 * @requires $.ui.core, $.ui.widget, $.lj.basicWidget, $.lj.bubble
 * @class Implements functionality of Promo in Journals page via JSON-RPC API
 * @extends $.lj.basicWidget
 * @author artem.tyurin@sup.com (Artem Tyurin)
 */

(function ($, window) {
	'use strict';

	$.widget('lj.journalPromoStrip', $.lj.basicWidget, {

		options: {
			selectors: {
				'popupInfo': '.journalpromo-popup-content-info',
				'popupDelete': '.journalpromo-popup-content-delete',

				'button': '#journalpromo-popup-btn',
				'iconClose': '.b-journalpromo-actions-close',

				'options': '.b-journalpromo-header-options',
				'promoItem': '.b-journalpromo-item',
				'iconDelete': '.b-journalpromo-actions-delete',

				'info': '.journalpromo-popup-info-action',
				'spinner': '.journalpromo-popup-spinner',
				'error': '.journalpromo-popup-info-error',
				'errorContent': '.journalpromo-popup-info-error-content',

				'ban': '#journalpromo-user-ban'
			},

			classNames: {
				'iconInfo': '.journalpromo-info-icon',
				'iconDelete': '.b-journalpromo-actions-delete',
				'noPromo': 'b-journalpromo-item-nopromotion'
			},

			template: "<dt><a href='{rules_link}'>{subject}</a> {ljuser}</dt><dd>{body}</dd>"
		},

		_create: function () {
			var that = this;
			$.lj.basicWidget.prototype._create.apply(this);

			this._el('spinner');
			this._el('info');
			this._el('button');
			this._el('iconClose');
			this._el('error');
			that._el('promoItem');
			this._el('iconDelete');
			this._el('popupDelete');
			this._el('errorContent');

			if (this._el('iconDelete')[0]) {
				this._deleteBubble = this._popupDelete.bubble({
					target: this._cl('iconDelete'),
					showOn: 'click'
				});
			}

			this._el('popupInfo').bubble({
				target: this._cl('iconInfo'),
				showOn: 'hover',
				closeControl: false,
				showDelay: 500
			});

			this._bindControls();
		},

		_toggleSpinner: function(isLoading) {
			this._spinner.toggle(isLoading);

			this._info.toggle(!isLoading);
		},

		_toggleError: function(isError, message) {
			this._error.toggle(isError);

			this._info.toggle(!isError);

			if (message) {
				this._errorContent.text(message);
			}
		},

		_updateBlock: function(entry) {
			if (!entry.object[0].object_url) {
				this._promoItem.html(
					'<span class="b-journalpromo-item-message">' +
					entry.object[0].body +
					'</span>'
				).addClass(this._cl('noPromo'));
			} else {
				this._promoItem.html(
					this.options.template.supplant({
						'rules_link': entry.object[0].object_url,
						'subject': entry.object[0].subject,
						'body': entry.object[0].body,
						'ljuser': entry.object[0].ljuser_display
					})
				);		
			}
		},

		_closeClick: function() {
			var that = this;

			if (location.hash === '#__debug') {
				return this._debug();
			}

			that._toggleSpinner(true);

			LJ.Api.call('journalpromo.admin_cancel', {
				object_url: that.options.url,
				user: Site.currentJournal,
				get_slot: 1,
				ban_user: document.getElementById('journalpromo-user-ban').checked
			}, function(result) {
				that._toggleSpinner(false);

				console.dir(result);

				// promo could have been withdrawn after the page load
				if (result.error && result.error.data && result.error.data.entry) {
					that._updated = result.error.data.entry[0];
					that._toggleError(true, result.error.message);

					console.error(result.error.message);
					return;
				}

				if (!result.error && result.entry) {
					var entry = result.entry[0];

					if (!entry || !entry.object || !entry.object[0]) {
						console.error('Wrong data', result);
						return;
					}

					// re-render item and hide controls
					that._updateBlock(entry);
					that._iconDelete.hide();
				}

				that._deleteBubble.bubble('hide');
			});
		},

		_disableClick: function() {
			var that = this;
			LJ.Api.call('journalpromo.disable_promo_announce', {journal: LJ.pageVar('currentJournal', true)}, function(result) {
				if (!result.error) {
					that.element.slideUp('fast');
				}
			});
		},

		_bindControls: function() {
			var that = this;
			$.lj.basicWidget.prototype._bindControls.apply(this);

			this._button.on('click', this._closeClick.bind(this));
			this._iconClose.on('click', this._disableClick.bind(this));

			if (this._deleteBubble) {
				this._deleteBubble.bind('bubblehide', function(ev) {
					that._toggleError(false);

					if (that._updated) {
						that._updateBlock(that._updated);
						that._iconDelete.hide();
					}
				});
			}
		},

		_debug: function() {
			var that = this;

			that._toggleSpinner(true);
			setTimeout(function() {
				that._toggleSpinner(false);
				that._toggleError(true, 'Sample error');
			}, 1000);
		}
	});
}(jQuery, window));


/* file-end: js/jquery/jquery.lj.journalPromoStrip.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/jquery/jquery.vkloader.js 
*/

/*!
 * LiveJournal loader for vkontakte like buttons.
 *
 * Copyright 2011, dmitry.petrov@sup.com
 *
 * VK script is often loaded with notable delay, so
 * plugin just loads it after the page rendering and
 * allows to display page faster.
 *
 */
(function ($) {
	'use strict';

	if ($.VK) {
		return;
	}

	$.VK = {};

	var onloads = [],
		buttons = [],
		onloadPassed = false,
		scriptLoaded = false,
		scriptLoading = false;

	/**
	 * Public API
	 *
	 * @namespase $.VK
	 */
	$.VK = {

		/**
		 * Init VK object after the script load.
		 *     Function passes all option to the VK.init
		 *  @param {Object} options
		 */
		init: function( options ) {
			onloads.push(function() {
				VK.init( options );
			});
		},

		/**
		 * Add button to init after script load.
		 *    If this method was called after the page load, and script wasn't downloaded yet,
		 *    it will trigger downloading.
		 */
		addButton: function( elementId, options ) {
			buttons.push( {
				id: elementId,
				options: options
			} );

			if( onloadPassed && !scriptLoading ) {
				if( scriptLoaded ) {
					initButtons();
				} else {
					loadScript( initButtons );
				}
			}
		}
	};

	function initButtons() {
		for( var i = 0; i < buttons.length; ++i ) {
			VK.Widgets.Like( buttons[ i ].id, buttons[ i ].options );
		}

		buttons = [];
	}

	function loadScript( onload ) {
		onload = onload || $.noop;
		scriptLoading = true;

		$.getScript( 'http://userapi.com/js/api/openapi.js?31', function() {
			scriptLoading = false;
			scriptLoaded = true;
			for( var i = 0; i < onloads.length; ++i ) {

				onloads[ i ]();
			}
			onloads = [];
			onload();
		} );
	}

	LiveJournal.register_hook('page_load', function() {
		//Do not download the script if the widgets were not added yet.
		if (buttons.length) {
			//Do not load the script directly after the page load.
			//We don't want to delay other onload functions somehow.
			setTimeout(function () {
				loadScript(initButtons);
			}, 500);
		}

		onloadPassed = true;
	});
}(jQuery));


/* file-end: js/jquery/jquery.vkloader.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/ljlive.js 
*/

function ellipsis(node)
{
	var s = document.documentElement.style,
		w = node.offsetWidth,
		clon = node.cloneNode(true);

	clon.style.position = "absolute";
	clon.style.width = "auto";
	clon.style.overflow = "visible";
	clon.style.top = "-10000px";

	node.parentNode.insertBefore(clon, node);
	if (clon.offsetWidth > w) {
		node.title = node[/*@cc_on"innerText"||@*/"textContent"];
		// FF2, FF3
		if (!("textOverflow" in s || "OTextOverflow" in s)) {
			var searcher = function(el, orig) {
				if (el.nodeType === 1 && el.tagName === "IMG") {
					orig.parentNode.removeChild(orig);
					el.parentNode.removeChild(el);
				}
				if (el.nodeType === 3) {
					var text = el.nodeValue;
					while (text.length > 0 && clon.offsetWidth > w) {
						text = text.substr(0, text.length - 1);
						el.textContent = text + "...";
					}
					if (text.length) {
						orig.textContent = el.textContent
							// replace space on end
							.replace(/[\s\.\,\-]+\.\.\.$/, '...');
						return true;
					}
					orig.textContent = el.textContent = "";
				}
				var i;
				for (i = el.childNodes.length - 1; i >= 0; i--) {
					if (searcher(el.childNodes[i], orig.childNodes[i])) {
						return true;
					}
				}
			};
			searcher(clon, node);
		}
	} else {
		node.title = "";
	}
	clon.parentNode.removeChild(clon);
	return node;
}

LJLive =
{
	is_full: false,

	getStateCode: function(state)
	{
		if (~navigator.userAgent.indexOf('iPad')) {
			return '';
		}
		var normalState = !Cookie('ljlive-is-min') && state !== false,
			code = '<div class="b-ljtimes-wrapper" id="ljtime">'
				+'<i class="i-ljtimes-border"></i>'
				+'<span class="i-ljtimes-btn" title="' + LJLive.ml_click_to_expand + '" onmousedown="return LJLive.tagMousedown(event)">'
					+'<i class="i-ljtimes-drag"></i>'
					+'<i class="i-ljtimes-click"></i>'
				+'</span>';

		if (!normalState) {
			jQuery('body').addClass('ljtimes-minimized');
		}

		var height = 21;

		if (normalState) {
			var param;
			if (Site.currentEntry) {
				param = {entry: Site.currentEntry};
			}
			code += '<iframe width="100%" height="24" frameborder="0" src="' + LiveJournal.getAjaxUrl('lj_times_string', param) + '" id="ljtime_iframe"></iframe>';
			height += 24;
		}

		var isServicePage = !LJ.pageVar('currentJournal', true).length || !!LJ.pageVar('scheme');

		if (isServicePage) {
			code += '</div>';
		} else {
			code += '</div><div id="ljtime_bottom" style="height:'+height+'px"></div>';
		}

		return code;
	},

	tagMousedown: function(e)
	{
		e = jQuery.event.fix(e);
		if (e.which !== 1) {
			return;
		}

		LJLive.writePostHide();

		if (!$('ljtime_iframe')) {
			jQuery('<iframe/>', {
				id: 'ljtime_iframe',
				src: LiveJournal.getAjaxUrl('lj_times_string'),
				frameborder: 0
			})
			.attr({
				height: 0,
				width: '100%'
			})
			.appendTo('#ljtime');
		}

		// one cursor in all document
		var transparentBG = jQuery('<div/>', {
			css: {
				cursor: 'row-resize',
				top: 0,
				left: 0,
				width: jQuery('body').width(),
				height: jQuery('body').height(),
				position: 'absolute',
				zIndex: 10000
			}
		}).appendTo(document.body);

		var node = $('ljtime_iframe'),
			is_click = true, mousemove_cnt = 0,
			diffX = e.clientX, diffY = e.clientY, startHeight = +node.height,
			return_false = function(){ return false; },
			mousemove = function(e)
			{
				if (is_click) {
					mousemove_cnt++;
					if (Math.max(mousemove_cnt, diffX - e.clientX, diffY - e.clientY) > 2) {
						is_click = false;
					}
				}
				var h = Math.max(0, Math.min(24, startHeight + diffY - e.clientY));
				node.height = h;
			},
			mouseup = function(e) {
				if (e.which !== 1) {
					return;
				}

				transparentBG.remove();

				if (is_click) {
					LJLive.full();
				}

				document[/*@cc_on'detachEvent'||@*/'removeEventListener'](/*@cc_on'on'+@*/'mousemove', mousemove, false);
				jQuery(document)
					.unbind('mouseup', mouseup)
					.unbind('selectstart', return_false);

				document.body.releaseCapture && document.body.releaseCapture();

				// oncomplete logic
				if (node.height > 24/2) { // expand
					jQuery('body').removeClass('ljtimes-minimized');
					node.height = 24;
					Cookie('ljlive-is-min', null, {domain: '.'+location.host.match(/[^.]+\.\w+$/)[0], path: '/' });
					jQuery('#ljtime_bottom').height(24+21);
				} else {
					node.height = 0;
					jQuery('body').addClass('ljtimes-minimized');
					Cookie('ljlive-is-min', 1, { expires: 2, domain: '.'+location.host.match(/[^.]+\.\w+$/)[0], path: '/' });
					jQuery('#ljtime_bottom').height(21);
				}
			};

		// using native method for speed
		document[/*@cc_on'attachEvent'||@*/'addEventListener'](/*@cc_on'on'+@*/'mousemove', mousemove, false);
		jQuery(document).mouseup(mouseup);
		// don't selection in IE
		if (jQuery.browser.msie) {
			jQuery(document).bind('selectstart', return_false);
		}
		// IE drag in all
		document.body.setCapture && document.body.setCapture();
		// for opera or drag&drop image
		e.originalEvent.preventDefault && e.originalEvent.preventDefault();
	},

	full: function()
	{
		if (LJLive.is_full) {
			return;
		}
		LJLive.is_full = true;

		// scroll for iframe
		var win = jQuery(window),
			html = jQuery(jQuery.boxModel ? 'html' : 'body'),
			html_overflow_x = html.css('overflow-x'),
			html_overflow_y = html.css('overflow-y'),
			last_scroll_top = win.scrollTop(),
			last_scroll_left = win.scrollLeft(),
			cont = jQuery('#ljtime'),
			full = cont.find('iframe'),
			iframe_src_param = Site.currentJournal ? {
				journal: Site.currentJournal
			} : null,
			iframe_src = LiveJournal.getAjaxUrl('lj_times_full', iframe_src_param);

		cont.height(cont.height());
		full.hide();

		var node = jQuery('<div class="b-ljtimes-wrapper b-ljtimes-lwrapper" id="ljtime-full" style="height:100%;left: -10000px">'
				+'<i class="i-ljtimes-border"><i class="i-ljtimes-bl"></i><i class="i-ljtimes-br"></i></i>'
				+'<span class="i-ljtimes-btn" style="top: -20px" title="'+LJLive.ml_click_to_close+'">'
					+'<i class="i-ljtimes-drag"></i>'
					+'<i class="i-ljtimes-click"></i>'
				+'</span>'
			+'<iframe src="' + iframe_src + '" width="100%" height="100%" style="height:100%;background:#fff" frameborder="0"></iframe>'
		+'</div>').appendTo('body');

		jQuery('#ljtime').addClass('b-ljtimes-opening');

		cont.animate({
			height: win.height()
		}, 1000, function(){
			// don't use overflow: hidden for Quirks mode
			html.css('overflow-x', 'hidden').css('overflow-y', 'hidden');
			node.css('left', 0);

			jQuery('#ljtime').removeClass('b-ljtimes-opening');

			node.find('.i-ljtimes-btn')
				.animate({
					top: 0
				}, 100)
				.click(function(){
					LJLive.is_full = false;
					// no jump
					win.scrollTop(last_scroll_top).scrollLeft(last_scroll_left);

					node
						.height(node.height())
						.animate({
							height: 24
						}, function(){
							node.remove();
							html.css('overflow-x', html_overflow_x)
								.css('overflow-y', html_overflow_y);
							full.show();

							win.scrollTop(last_scroll_top).scrollLeft(last_scroll_left);
						});
				});

			cont.height('auto');
		}).css('overflow', 'visible');
	},

	messagesIsShow: false,
	messagesShow: function(target)
	{
		var node = jQuery(target).parents('.b-inbox'),
			show_node = jQuery('<div class="b-ljtimes-inbox b-popup"><div class="b-popup-outer"><div class="b-popup-inner"><span class="b-ljtimes-inbox-item">'+LJLive.ml.loading+'</span><i class="i-popup-arr i-popup-arrb"></i></div></div></div>')
				.appendTo('body');

		var user_url = '';
		if (/^(community|users)\./.test(location.host)) {
			user_url = '/'+Site.currentJournal;
		}

		this.initPopup(target, show_node, 'messages', function(target){
			show_node.find('.b-popup-inner')
				.html('<span class="b-ljtimes-inbox-item">'+LJLive.ml.loading+'</span>');

			jQuery.getJSON(
				user_url + '/__alerts/get.html',
				function(data)
				{
					if (!data.messages.length) {
						node.find('.arrow').html(0);
						show_node.remove();
					}

					var rec_ids = [],
						html = '', i;
					data.messages = data.messages.splice(0, 5);

					for (i = -1; data.messages[++i];) {
						rec_ids.push(data.messages[i].rec_id);
						html += '<span class="b-ljtimes-inbox-item">'+data.messages[i].message+'</span>';
					}

					show_node.find('.b-popup-inner').html(html);
					jQuery.post(
						user_url + '/__alerts/mark_readed.html',
						{rec_id: rec_ids.join(',')},
						function(data){
							+data.unread_count
								? node.find('a').text(data.unread_count)
								: node.find('.arrow').html(0);
						}, 'json');
				}
			);
		});

		LJLive.messagesShow(target);
	},
	messagesHide: jQuery.noop,

	_loginNode: null,
	_loginShow: function(target, method)
	{
		if (!LJLive._loginNode) {
			LJLive._loginNode = jQuery('<div class="b-ljtimes-update">' + LJLive.ml.html_login_form + '</div>').appendTo('body');
		}

		var show_node = LJLive._loginNode;
		this.initPopup(target, show_node, method, jQuery.noop, true);
		LJLive[method + 'Show'](target);
	},

	writePostIsShow: false,
	writePostShow: function(target)
	{
		if (!Site.has_remote) {
			LJLive._loginShow(target, 'writePost');
			return;
		}

		var auth_token, right,
			html = '<div class="b-ljtimes-update">' + LJLive.ml.html_submit_form + '</div>',
			show_node = jQuery(html).appendTo('body'),
			form_node = show_node.find('form');

		this.initPopup(target, show_node, 'writePost', function(target){
			jQuery.post(LiveJournal.getAjaxUrl('quick_post'),
				{get_auth: 1},
				function(data){
					auth_token = data.auth;
				}, 'json');
		}, false, true);

		LJLive.writePostShow(target);

		form_node.find('input, textarea').placeholder();

		form_node
			.submit(function(e){
				jQuery.post(LiveJournal.getAjaxUrl('quick_post'),
					form_node.serialize() + '&auth_token=' + auth_token,
					function(data){
						LJLive.writePostHide();
						var html;
						if (data.error) {
							html = '<div class="b-ljtimes-update b-ljtimes-success b-popup"><div class="b-popup-outer"><div class="b-popup-inner">'
									+'<span class="b-ljtimes-success-body">'+data.error+'</span>'
									+'<i class="i-popup-arr i-popup-arrb"></i><i class="i-popup-close"></i>'
								+'</div></div></div>';
						} else {
							html = '<div class="b-ljtimes-update b-ljtimes-success b-popup"><div class="b-popup-outer"><div class="b-popup-inner">'
								+'<span class="b-ljtimes-success-title">'+LJLive.ml.post_created_title+'</span>'
								+'<span class="b-ljtimes-success-body">'+LJLive.ml.post_created_body.replace('[[url]]', data.entry_url)+'</span>'
								+'<i class="i-popup-arr i-popup-arrb"></i><i class="i-popup-close"></i>'
							+'</div></div></div>';
							form_node[0].reset();
							form_node[0].send.disabled = true;
						}

						var node = jQuery(html)
								.appendTo('body')
								.css('right', right);

						node.find('a.ljtimes_again').click(function(e){
							jQuery(document).mousedown(); // close
							LJLive.writePostShow(target);
							e.preventDefault();
						});

						node.find('.i-popup-close').click(function() {
							jQuery(document).mousedown(); // close
						});

						node.mousedown(function(e){
							e.stopPropagation();
						});
						jQuery(document)
							.add(node.find('.i-ljtimes-logged-close'))
							.one('mousedown', function(){
								node.remove();
							});
					}, 'json');
			e.preventDefault();

			// Google Analytics
			LJLive.window._gaq.push(['_trackEvent', 'Mini LJTimes', 'post', 'Write form - posted']);
		});

		form_node.find('textarea').input(function(){
			form_node[0].send.disabled = !this.value.length;
		});
	},
	writePostHide: jQuery.noop,

	suggestBubble: null,
	suggestBubbleRemove: function()
	{
		if (LJLive.suggestBubble) {
			LJLive.suggestBubble.remove();
		}
	},

	suggestIsShow: false,
	suggestShow: function(target)
	{
		if (!Site.has_remote) {
			LJLive._loginShow(target, 'suggest');
			return;
		}

		var show_node = jQuery(LJLive.ml.html_suggest_form)
				.mousedown(function(e) {
					e.stopPropagation();
				})
				.appendTo('body'),
			auth_token;

		this.initPopup(target, show_node, 'suggest', function(target){
			if (Site.currentEntry) {
				jQuery(form_node[0].url).val(Site.currentEntry).placeholder().input();
			}

			jQuery.post(LiveJournal.getAjaxUrl('lj_times_recommend'),
				{get_auth: 1},
				function(data){
					auth_token = data.auth;
				}, 'json');
		});

		var form_node = show_node.find('form');
		jQuery(form_node[0].url)
			.placeholder()
			.input(function(){
				form_node[0].send.disabled = !this.value || this.value === this.getAttribute('placeholder');
			});

		LJLive.suggestShow(target);

		form_node.submit(function(e){
			form_node[0].send.disabled = true;
			jQuery.post(LiveJournal.getAjaxUrl('lj_times_recommend'),
				form_node.serialize() + '&auth_token=' + auth_token,
				function(data){
					LJLive.suggestHide();

					if (Site.currentEntry && Site.currentEntry == form_node[0].url.value) {
						jQuery('span', target).html(
							LJLive.ml.suggest_already.replace('[[num]]', data.currentEntryRecommendations)
						);
					}

					var right = jQuery(window).width() - jQuery(target).offset().left - jQuery(target).width()/2 - 40,
						html = '<div class="b-ljtimes-suggest b-ljtimes-success b-popup"><div class="b-popup-outer"><div class="b-popup-inner">'
							+'<span class="b-ljtimes-success-body">'+(data.ret || data.error)+'</span>'
							+'<i class="i-popup-arr i-popup-arrbr"></i><i class="i-popup-close"></i>'
						+'</div></div></div>';

					var node = jQuery(html)
							.appendTo('body')
							.css('right', right);

					node.find('a.ljtimes_again').click(function(e){
						jQuery(document).mousedown(); // close
						LJLive.writePostShow(target);
						e.preventDefault();
					});

					node.find('.i-popup-close').click(function() {
						jQuery(document).mousedown(); // close
					});

					node.mousedown(function(e){
						e.stopPropagation();
					});

					jQuery(document)
						.add(node.find('.i-ljtimes-logged-close'))
						.one('mousedown', function(){
							node.remove();
						});

					form_node[0].reset();

					LJLive.window._gaq.push(['_trackEvent', 'Mini LJTimes', 'post', 'Suggest form - posted']);
			}, 'json');

			e.preventDefault();
		});
	},
	suggestHide: jQuery.noop,

	initPopup: function(target, show_node, method, showHandler, checkData, stayOnDocumentClick) {
		show_node.mousedown(function(e){
			e.stopPropagation();
		});

		LJLive[method + 'Show'] = function(target) {
			LJLive[method + 'IsShow'] = true;
			show_node.show();
			//we need to store method name with node, because every handler should close the popup
			//only if its above the correspoinding link
			show_node.data('method', method);

			var right = jQuery(window).width() - jQuery(target.parentNode).offset().left - target.parentNode.offsetWidth;
			right += target.parentNode.offsetWidth/2 - 40; // arrow of center
			show_node.css('right', Math.max(right, 4));

			showHandler.call(this, target);
		};

		LJLive[method + 'Hide'] = function(){
			LJLive[method + 'IsShow'] = false;
			show_node
				.data('method', null)
				.hide();
		};

		show_node.find('.i-popup-close').click(LJLive[method + 'Hide']);

		if (!stayOnDocumentClick) {
			jQuery(document).mousedown(function(e, iframe_target) {
				var cur_method = !!checkData && show_node.data('method'),
					parent = iframe_target && iframe_target.parentNode;

				if (parent && parent.tagName.toLowerCase() === 'a' && target === parent) {
					return;
				}

				if (target !== iframe_target &&
						(!checkData || !cur_method || cur_method === method)) {
					LJLive[method + 'Hide']();
				}
			});
		}
	},

	calcTime: function(ts)
	{
		if (typeof ts === 'number') {
			var minutes = Math.ceil((LJLive.now - ts) / 60);
			ts = minutes + ' ' + LJLive.ml.timeText(minutes);
		}
		return ts;
	},

	frameInit: function(frame)
	{
		LJLive.frame_body = frame.document.body;
		LJLive.ml = frame.ML_ljtimes;
		LJLive.now = frame.now;
		LJLive.window = frame;

		// fire event for main document
		jQuery(LJLive.frame_body)
			.mousedown(function(e){
				jQuery(document).trigger('mousedown', e.target);
			})
			// don't use stopPropagation
			// write post don't hide if mousedown on document
			.delegate('.b-update a', 'mousedown', function() {
				LJLive.suggestHide();
				LJLive.suggestBubbleRemove();

				!LJLive.writePostIsShow
					? LJLive.writePostShow(this)
					: LJLive.writePostHide();

				LJLive.window._gaq.push(['_trackEvent', 'Mini LJTimes', 'click', 'Write form - clicked']);
			})
			.delegate('.b-inbox a', 'mousedown', function() {
				LJLive.writePostHide();
				LJLive.suggestHide();
				LJLive.suggestBubbleRemove();

				!LJLive.messagesIsShow
					? LJLive.messagesShow(this)
					: LJLive.messagesHide();

				LJLive.window._gaq.push(['_trackEvent', 'Mini LJTimes', 'click', 'Messages']);
			})
			.delegate('.b-suggest a', 'mousedown', function() {
				LJLive.writePostHide();
				LJLive.suggestBubbleRemove();

				!LJLive.suggestIsShow
					? LJLive.suggestShow(this)
					: LJLive.suggestHide();

				LJLive.window._gaq.push(['_trackEvent', 'Mini LJTimes', 'click', 'Suggest clicked']);
			});

		jQuery('.b-update, .b-inbox', LJLive.frame_body).click(function(e){
			e.preventDefault();
		});

		// Google Analytics
		jQuery('.b-random', LJLive.frame_body).click(function(){
			LJLive.window._gaq.push(['_trackEvent', 'Mini LJTimes', 'click', 'Random journal']);
		});

		// TODO after 14 remove with branding
		if (LJLive.feb14 === true) {
			// place hearts in right place
			var suggest_link = jQuery('.b-suggest a', LJLive.frame_body),
				love_pic = jQuery('<i class="i-ljtimes-love" onmousedown="return LJLive.tagMousedown(event)"></i>').appendTo('#ljtime');

			setTimeout(function() {
				var right = jQuery(window).width() - suggest_link.offset().left; //place upper part of picture right above bottom one
				love_pic.css('right', right + 'px').show();
			}, 100);
		}
	},

	insertAdditionalHTML: function() {
		jQuery('#ljtime').append( LJLive.ml.html_additional );
	},

	helpBubbleInit: function()
	{
		if (Cookie('ljlive-bubble') === '2') {
			return;
		}

		var $win = jQuery(window),
			$doc = jQuery(document);

		function show_bubble(text)
		{
			$win.unbind('scroll', check_to_show_bubble);
			$doc.unbind('mousemove', check_to_show_bubble);
			jQuery('#ljtime').unbind('mouseover', check_to_show_bubble);

			var bubble = jQuery(LJLive.ml.html_bubble).appendTo('#ljtime');
			bubble
				.find('.b-ljtimes-bubble-p')
				.html(text);
			bubble
				.css('top', -bubble.height() - 27)
				.find('.b-ljtimes-bubble-close')
					.click(function(){
						bubble.remove();
						Cookie('ljlive-bubble', 1, { expires: 355, domain: '.'+location.host.match(/[^.]+\.\w+$/)[0], path: '/' });

						// suggest bubble
						show_suggest_bubble();
					});
		}

		function show_suggest_bubble()
		{
			var bubble = jQuery(LJLive.ml.html_suggest_bubble),
				suggestLink = jQuery(LJLive.frame_body).find('.b-suggest a'),
				// arrow of center
				right = $win.width() - suggestLink.offset().left - suggestLink.width()/2 - 40;

			bubble
				.css('right', right)
				.find('.i-popup-close')
					.click(function(){
						bubble.remove();
						Cookie('ljlive-bubble', 2, { expires: 355, domain: '.'+location.host.match(/[^.]+\.\w+$/)[0], path: '/' });
					})
				.end()
				.appendTo('#ljtime');

			LJLive.suggestBubble = bubble;
		}

		var timeout;
		function check_to_show_bubble(e)
		{
			clearTimeout(timeout);
			switch(e.type) {
				case 'mousemove': // user rests
					timeout = setTimeout(function(){
						show_bubble(LJLive.ml.bubble_rests);
					}, 1000*60);
					break;
				case 'scroll': // bottom page
					if ($win.scrollTop() + $win.height() === $doc.height()) {
						show_bubble(LJLive.ml.bubble_scroll);
					}
					break;
				case 'mouseover':
					show_bubble(LJLive.ml.bubble_mouseover);
					break;
			}
		}

		if (!Cookie('ljlive-bubble')) {
			$win.scroll(check_to_show_bubble);
			$doc.mousemove(check_to_show_bubble);
			jQuery('#ljtime').mouseover(check_to_show_bubble);
		} else if (Cookie('ljlive-bubble') === '1') {
			show_suggest_bubble();
		}
	},

	dataInit: function(data)
	{
		if (data.mode === 'night') {
			jQuery('.b-ttiny', LJLive.frame_body).addClass('b-ttiny-night');
		}
		var i;
		for (i = -1; data.live[++i];) {
			data.live[i].text = data.live[i].text + ', ' + LJLive.calcTime(data.live[i].ts);
		}

		// TODO: delete
		if (LJLive.window.additional_data) {
			var i = -1;
			for (; LJLive.window.additional_data[++i]; ) {
				data.live.splice(Math.round(i*2.3), 0, LJLive.window.additional_data[i])
			}
		}

		for (i = -1; data.themes[++i];) {
			data.themes[i].text = data.themes[i].text + ', ' + LJLive.calcTime(data.themes[i].ts);
		}

		var text_ary = data
						.live.concat(data.themes)
						.sort(function(){ return Math.round(Math.random())-0.5; });

		if (text_ary.length) {
			i = 0;
			var last_node,
				before_last_node,
				post_container = jQuery('.b-posts', LJLive.frame_body),
				logo_width = jQuery('.b-logo', LJLive.frame_body).outerWidth(),
				interval,
				anim_complete = true,
				fade_nodes = function( in_node, out_node ) {
					var anim_count = 2,
						fadeFinshed = function() {
							anim_count--;
							anim_complete = anim_count === 0;
						};

					anim_complete = false;
					out_node.fadeTo(800, 0, function() {
						jQuery(this).remove();
						fadeFinshed();
					} );
					in_node.fadeTo(800, 1, function() {
						fadeFinshed();
					} );
				},
				interval_func = function()
				{
					if( !anim_complete ) { return; }

					if (!text_ary[i+1]) {
						i = -1;
					}
					var post_data = text_ary[++i],
						node = jQuery('<li>'+post_data.text+'</li>', LJLive.frame_body.ownerDocument),
						width = jQuery(window).width() - logo_width - jQuery('.b-quick', LJLive.frame_body).outerWidth() - jQuery('.b-inbox', LJLive.frame_body).width();

					node
						.mouseenter(function(){
							clearInterval(interval);
						})
						.mouseleave(function(){
							clearInterval(interval);
							interval = setInterval(interval_func, 5000);
						})
						.css('width', width);

					if (last_node) {
						node.css('opacity', 0);
					}

					node.appendTo(post_container);

					ellipsis(node[0]);

					if (last_node) {
						fade_nodes( node, last_node );
					}

					//Google Analytics
					var click_node = node.find('a:first');
					if (!click_node[0].onclick) {
						click_node.click(function(e) {
							LJLive.window._gaq.push(['_trackEvent', 'Live - mini ljtimes', 'click', this.href]);
							// if no new tab
							if (this.target !== '_blank' && !(e.metaKey || e.altKey || e.shiftKey || e.ctrlKey) && e.which === 1) {
								setTimeout('top.location="' + this.href + '"', 100);
								e.preventDefault();
							}
						});
					}

					last_node = node;
				};

			interval = setInterval(interval_func, 5000);
			interval_func();
		}

		LJLive.insertAdditionalHTML();
		jQuery(document).trigger('ljliveReady');
	}
};


/* file-end: js/ljlive.js 
----------------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------------
   file-start: js/lj.api.js 
*/

(function ($) {
	"use strict";
	/**
	 * TODO:
	 *
	 * If this api will go outside of livejournal.com it should get rid of all dependencies
	 * from jquery.js and basic.js and should require only a few libs from LJ namespace through LJ.require
	 * to handle everything.
	 */

	/**
	 * @namespace LJ.Api
	 * @requires basic.js, jquery.js, livejournal.js, jquery/jquery.xdomainrequest.js, lj.postmessage.js
	 * @description Api provides an unified method to handle communications with the server.
	 * @author dmitry.petrov@sup.com (Dmitry Petrov), anazarov@sup.com (Alexander Nazarov)
	 */
	LJ.define('LJ.Api');

	LJ.require('LJ.console');
	LJ.require('LJ.Support');

	var origin = location.protocol + '//' + location.host,
		siteroot = window.Site? Site.siteroot : origin,
		url = '/__api/',
		cdn = {
			endpoint: (window.Site && location.protocol === 'http:')? (Site.jsonrpcprefix || Site.statprefix) : null,
			time: (window.Site? Site.server_time * 1000 : +new Date()),
			methods: {}
		},
		context = {
			options: {},
			endpoint: siteroot,
			sameDomain: siteroot === origin,
			batchTimeout: 125
		},
		batchQueue = [],
		batchTimeout,
		corsParameters = $.extend({
			url: context.endpoint + url,
			type: 'POST',
			dataType: 'json',
			contentType: 'text/plain'
		}, context.sameDomain? {} : {
			xhrFields: {
				withCredentials: true
			}
		});

	cdn.time -= cdn.time % 9E+5;

	function createRequestBody(name, params) {
		return {
			jsonrpc: '2.0',
			method: name,
			params: $.extend({}, params, { auth_token: context.options.auth_token }),
			id: Unique.id()
		};
	}

	function handleAnswer (name, params, callback, answer) {
		if (answer.result) {
			if (!answer.result.auth_token) {
				LJ.console.warn('Server did not return the new auth_token, further request may fail');
			} else {
				context.options.auth_token = answer.result.auth_token;
				delete answer.result.auth_token;
			}

			if (callback) {
				callback(answer.result);
			}
		} else if (answer.error) {
			if (callback) {
				callback({ error: answer.error });
			}
		} else {
			LJ.warn('Server did not return error or result in response for method ' + name);

			if (callback) {
				callback({
					error: {
						message: 'Invalid response',
						code: 2
					}
				});
			}
		}
	}

	function handleError (name, params, callback) {
		LJ.warn('An internal error has occured while calling the method ', name);

		if (callback) {
			callback({
				error: {
					message: 'Internal error',
					code: 1
				}
			});
		}
	}

	function defer (request, params, callback) {
		var promise = new $.Deferred();

		batchQueue.push({
			data: request,
			params: params,
			callback: callback,
			promise: promise
		});

		if (!batchTimeout) {
			batchTimeout = setTimeout(function () {
				var query = batchQueue.splice(0, batchQueue.length);

				$.ajax($.extend(corsParameters, {
					data: LiveJournal.JSON.stringify(query.map(function (request) { return request.data; }))
				})).success(function (data) {
					var i, j, l, k, response, request;

					for (i = 0, l = data.length; i < l; i++) {
						response = data[i];

						for (j = 0, k = query.length; j < k; j++) {
							request = query[j];

							if (request.data.id === response.id) {
								if (request.promise.state() === 'pending') {
									/* Return result */
									handleAnswer(request.data.method, request.params, request.callback, response);
									request.promise.resolve();
								}
							}
						}
					}

					/* Some requests left unresolved */
					for (j = 0, k = query.length; j < k; j++) {
						request = query[j];

						if (request.promise.state() === 'pending') {
							handleError(request.data.method, request.params, request.callback);
							request.promise.resolve();
						}
					}
				}).error(function () {
					var i, l, request;

					for (i = 0, l = query.length; i < l; i++) {
						request = query[i];

						if (request.promise.state() === 'pending') {
							/* Return error */
							handleError(request.data.method, request.params, request.callback);
							request.promise.resolve();
						}
					}
				});

				batchTimeout = null;
			}, context.batchTimeout);
		}

		return promise;
	}

	/**
	 * Init LJ functionality.
	 *
	 * @param {Object} options Options for init object. auth_token field is required for further actions.
	 */
	LJ.Api.init = function(options) {
		options = options || {};

		if (context._initFired) {
			LJ.console.warn('LJ.Api.init was already called before');
		}

		context._initFired = true;
		context.options = $.extend({}, options);

		if (!context.options.auth_token) {
			LJ.console.warn('Auth token has not been specified, request may fail');
		}

		if (cdn.endpoint) {
			if (Site.rpc && Array.isArray(Site.rpc.public)) {
				Site.rpc.public.forEach(function (method) {
					cdn.methods[method] = true;
				});
			}
		}

		LJ.UI.bootstrap('lj-api');
	};

	/**
	 * Call api method on the server.
	 *
	 * @param {string} name Method name.
	 * @param {Object=} params A hash with parameters to send to the server.
	 * @param {Function=} callback Callback will be fired with results from the server.
	 */
	LJ.Api.call = function (name, params, callback) {
		var request = createRequestBody(name, params),
			publicMethod = !!cdn.methods.hasOwnProperty(name),
			endpoint = publicMethod? cdn.endpoint : context.endpoint,
			ajax, reqstr;

		if (!publicMethod && (LJ.Support.cors || context.sameDomain)) {
			/* CORS support detected or is not needed */
			return defer(request, params, callback);
		}

		/* Fall back to JSONP */
		if (publicMethod) {
			delete request.params.auth_token;
			request.id = cdn.time;
		}

		reqstr = LiveJournal.JSON.stringify(request);

		ajax = $.ajax($.extend({
			url: endpoint + url,
			dataType: 'jsonp',
			data: { request: reqstr }
		}, publicMethod? { cache: true, jsonpCallback: 'jQuery' + cdn.time } : {}));

		ajax
			.success(handleAnswer.bind(null, name, params, callback))
			.error(handleError.bind(null, name, params, callback));

		return ajax.promise();
	};
}(jQuery));


/* file-end: js/lj.api.js 
----------------------------------------------------------------------------------*/
