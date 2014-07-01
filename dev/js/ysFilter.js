;(function($, window) {

	//Private Methods
	var priv = {
		init: function() {
			var $this = this;
			//Read url hash
			$this.set.filteredBy = priv.dehashify.apply($this, [window.location.hash]);
			if($this.set.debug === true) console.log('var ', $this.set.filteredBy);
			$this.set.currentHash = window.location.hash;
			$this.addClass('ysFilter-loading');
			if($this.set.currentHash !== '') {
				$this.addClass('ysFilter-filtered');
				if($this.set.updateWHash !== false) {
					$('.' + $this.set.updateWHash).each(function() {
						var href = $(this).attr('href');
						$(this).attr('href', href + $this.set.currentHash);
					});
				}
			}
			if(parseInt($this.set.filteredBy.page) > 1) $this.find('.prev').closest('.paging').show();
			//Ajax in products - json string
			$.ajax({
				url: $this.set.url,
				type: 'GET',
				cache: true,
				dataType: 'JSON',
				success: function(data) {
					$this.filter = data;
					if($this.set.debug === true) console.log('var $this.filter', $this.filter);
					priv.buildFilter.apply($this);
					priv.enableEvents.apply($this);
					$this.set.limit = data.limit;
					$this.set.pages = Math.ceil(data.items.length / $this.set.limit);

					//If previously filtered. Run filter else load all products.
					if($this.set.currentHash !== '') {
						priv.gatherItems.apply($this);
						priv.reSelect.apply($this);
					} else {
						//We clone the array objects in the array however keep references. 
						//Now we can sort the array without screwing original order.
						$this.set.currentItems = $this.filter.items.slice(0);
						//Replace even on first load if debug: true
						if($this.set.debug === true) priv.renderItems.apply($this);
					}
				}
			});

		},
		buildFilter: function() {
			//Builds filtering elements.
			var $this = this,
				$filters = $this.find('.' + $this.set.groupClass),
				html = '',
				create = '',
				tplAdditions = {},
				len = $this.filter.desc.param_types.length,
				splitSizeEnd = $this.set.splitSizes !== false ? '</' + $this.set.splitSizes.match(/<([a-z]+)/)[1] + '>' : '';


			//Sort ends up in a different part of the filter attrs. Needs to be looped through seperately.
			if($this.filter.sort !== undefined) {
				var $sort = $('#sort'),
					initDesc = $this.filter.sort.init !== undefined ? $this.filter.sort.init : '';

				create = $sort.data('create');
				tplAdditions = $this.set.filterOptions[cat] || {};

				for(var sort in $this.filter.sort) {
					if(sort === 'init') continue;
					if($this.filter.sort[sort].asc) html += priv.buildFilterTemplate.call($this, create, 'sort-' + sort + '-asc', '["' + sort + '","asc"]', $this.filter.sort[sort].asc, tplAdditions);
					if($this.filter.sort[sort].dsc) html += priv.buildFilterTemplate.call($this, create, 'sort-' + sort + '-dsc', '["' + sort + '","dsc"]', $this.filter.sort[sort].dsc, tplAdditions);
				}

				if(tplAdditions.wrapperGroup !== undefined) html = tplAdditions.wrapperGroup + html + '</' + tplAdditions.wrapperGroup.match(/<([a-z]+)/)[1] + '>';
				if(create === 'fakeSelect') {
					html = priv.buildFilterTemplate.call($this, 'start_' + create, '', '', initDesc, tplAdditions) + html;
					html = '<div class="filter-value fake-select"><span data-orig-text="' + initDesc + '">' + initDesc + '</span><ul class="ul-clean fake-select-list">' + html + '</ul></div>';
				}
				if(create === 'select' || create === 'multiSelect') html = '<select class="filter-value"' + (create === 'multiSelect' ? ' multiple="multiple"' : '') + '><option value="0">' + initDesc + '</option>' + html + '</select>';

				$sort.append(html);
			}

			for (var i = 0; i < len; i++) {
				var cat = $this.filter.desc.param_types[i],
					catDesc = $this.filter.desc.param_descs[cat],
					$filter = $filters.filter('#' + cat),
					type = $filter.data('type'),
					subHtml = '',
					desc = '',
					whichGroup = null,
					currGroup = null,
					treeParts = [];
				
				html = '';
				create = $filter.data('create');
				tplAdditions = $this.set.filterOptions[cat] || {};

				for (var underCat in $this.filter.desc[cat]) {
					
					desc = $this.filter.desc[cat][underCat].name;
					
					if($this.filter.desc[cat][underCat].data) {
						if($this.filter.desc[cat][underCat].data.color !== '') {
							desc = [desc, $this.filter.desc[cat][underCat].data.color];
						} else if($this.filter.desc[cat][underCat].data.hex !== '') {
							desc = [desc, $this.filter.desc[cat][underCat].data.hex];
						}
					}
					
					if(desc.indexOf('###') !== -1) {
						//Handling of tree categories.
						whichGroup = 'tree';
						treeParts = desc.split('###');
						desc = treeParts.pop();
						if(currGroup !== treeParts.join('')) {
							if(currGroup !== null) {
								//Add subhtml to html only when the group has changed.
								html += priv.buildFilterTemplate.call($this, 'group_' + create, '', subHtml, currGroup, tplAdditions);
								subHtml = '';
							}
							currGroup = treeParts.join('');
						}
						subHtml += priv.buildFilterTemplate.call($this, create, cat + '-' + underCat, underCat, desc, tplAdditions);
					} else if($this.set.splitSizes !== false && cat === 'size') {
						//Handling of split size groups.
						whichGroup = 'size';
						sizeTables = underCat.split('_');
						if(currGroup !== sizeTables[0]) {
							if(currGroup !== null) {
								html += $this.set.splitSizes + subHtml + splitSizeEnd;
								subHtml = '';
							}
							currGroup = sizeTables[0];
						}
						subHtml += priv.buildFilterTemplate.call($this, create, cat + '-' + underCat, underCat, desc, tplAdditions);
					} else {
						//Handling of all other JSParams.
						html += priv.buildFilterTemplate.call($this, create, cat + '-' + underCat, underCat, desc, tplAdditions);
					}
				}

				if(currGroup !== null) {
					if(whichGroup === 'tree') {
						html += priv.buildFilterTemplate.call($this, 'group_' + create, '', subHtml, currGroup, tplAdditions);
					} else {
						html += $this.set.splitSizes + subHtml + splitSizeEnd;
					}
				}
				if(tplAdditions.wrapperGroup !== undefined) html = tplAdditions.wrapperGroup + html + '</' + tplAdditions.wrapperGroup.match(/<([a-z]+)/)[1] + '>';
				if(create === 'fakeSelect') {
					subHtml = priv.buildFilterTemplate.call($this, 'start_' + create, '', underCat, catDesc, tplAdditions);
					html = '<div class="filter-value fake-select"><span data-orig-text="' + catDesc + '">' + catDesc + '</span><ul class="ul-clean fake-select-list">' + subHtml + html + '</ul></div>';
				}
				if(create === 'select' || create === 'multiSelect') html = '<select name="' + cat + '" class="filter-value"' + (create === 'multiSelect' ? ' multiple="multiple"' : '') + '><option value="0">' + catDesc + '</option>' + html + '</select>';
				$filter.append(html);
			}

			//Filter is loaded and ready to use.
			$this.removeClass('ysFilter-loading ysFilter-filtered').addClass('ysFilter-loaded');
			
			//Trigger callback for added functionality
			if($this.set.afterFilterRendered !== undefined) {
				$this.set.afterFilterRendered();
			}

		},
		buildFilterTemplate: function(create, id, val, desc, obj) {
			//Loop through filter alterations.
			//Change them to string values.
			//Insert them in templates.
			var $this = this,
				valObj = {'desc': desc},
				classes = '',
				wrapStart = '',
				wrapEnd = '',
				attrs = '',
				style = '',
				backgroundStyle = '',
				backgroundText = '',
				background = false;

			for(var options in obj) {
				switch (options) {
					case 'classNames':
						classes = obj[options].join(' ');
						break;
					case 'background':
						background = obj[options];
						break;
					case 'attrs':
						attrs = ' ' + obj[options].replace('{desc}', desc[0]);
						break;
					case 'wrapper':
						wrapStart = obj[options];
						wrapEnd = '</' + obj[options].match(/<([a-z]+)/)[1] + '>';
						break;
				}
			}

			if(typeof desc === 'object') {
				valObj.desc = desc[0];
				if(background) {
					style = (desc[1] && desc[1].substr(0,1) === '#') ? 'background-color: ' + desc[1] : 'background-image: url(\'' + DYN + 'attributes/' + desc[1] + '\')';
				}
			}

			if($this.set.eachFilterAttrs !== undefined) {
				valObj = $this.set.eachFilterAttrs(valObj);
			}

			backgroundStyle = background ? ' style="' + style + '"' : '';
			backgroundText = background ? '' : valObj.desc;

			//Repeating elements
			if(create === 'a') return wrapStart + '<a id="' + id + '" class="' + classes + ' filter-value" href="#"' + backgroundStyle + ' data-value=\'' + val + '\'' + attrs + '>' + backgroundText + '</a>' + wrapEnd;
			if(create === 'select' || create === 'multiSelect') return '<option id="' + id + '" value="' + val + '">' + valObj.desc + '</option>';
			if(create === 'fakeSelect') return '<li class="' + classes + '"' + attrs + '><a id="' + id + '" class="filter-value" href="#"' + backgroundStyle + ' data-value=\'' + val + '\'>' + backgroundText + '</a></li>';
			//These need parents for disabling and selecting.
			if(create === 'radio') return wrapStart + '<input id="' + id + '" type="radio" class="' + classes + ' filter-value" value="' + val + '" /><label' + backgroundStyle + ' for="' + id + '">' + backgroundText + '</label>' + wrapEnd;
			if(create === 'checkbox') return wrapStart + '<input id="' + id + '" type="checkbox" class="' + classes + ' filter-value" value="' + val + '" /><label' + backgroundStyle + ' for="' + id + '">' + backgroundText + '</label>' + wrapEnd;
			//Handling of grouping for tree categories
			if(create === 'group_select') return '<optgroup label="' + valObj.desc + '">' + val + '</optgroup>';
			//Initial remove value
			if(create === 'start_fakeSelect') return '<li class="' + classes + '"' + attrs + '><a class="remove" href="#">' + valObj.desc + '</a></li>';
			return '';
		},
		enableEvents: function() {
			var $this = this;

			$this.on('change', '.filter-group select.filter-value', function(e) {
				e.preventDefault();
				var type = $(this).closest('.filter-group').data('type'),
					cat = $(this).closest('.filter-group').attr('id'),
					val = $(this).val();
				
				if(cat !== 'sort') $this.set.latestCat = cat;

				priv.updateFilter.apply($this, [type, cat, val]);
			});

			$this.on('click', '.filter-group a.filter-value', function(e) {
				e.preventDefault();
				var type = $(this).closest('.filter-group').data('type'),
					cat = $(this).closest('.filter-group').attr('id'),
					val = $(this).data('value');
				
				if(cat !== 'sort') $this.set.latestCat = cat;

				if(!$(this).hasClass('disabled')) {
					$(this).toggleClass($this.set.filterSelectedClass);
					priv.updateFilter.apply($this, [type, cat, val]);
				}
			});

			$this.on('click', '.remove', function(e) {
				e.preventDefault();
				//Remove all from group
				var $group = $(this).closest('.filter-group'),
					type,
					cat,
					val;
				
				if($group.length === 0) $group = $(this).siblings('.filter-group');

				type = $group.data('type');
				cat = $group.attr('id');
				val = 'remove';

				$group.find('.' + $this.set.filterSelectedClass).removeClass($this.set.filterSelectedClass);
				$group.find('select').find('option').removeAttr('disabled').filter(':selected').removeAttr('selected');
				priv.updateFilter.apply($this, [type, cat, val]);
			});

			$this.on('click', '.remove-all', function(e) {
				e.preventDefault();
				//Remove all filters
				$this.set.filteredBy = {};
				$this.set.filteredBy.page = 1;
				$this.set.currentHash = '';
				window.location.hash = $this.set.currentHash;
				$this.find('.filter-group .' + $this.set.filterSelectedClass).removeClass($this.set.filterSelectedClass);
				$this.find('.filter-group option').removeAttr('disabled').filter(':selected').removeAttr('selected');
				priv.gatherItems.apply($this);
			});

			$this.on('click', '.next', function(e) {
				e.preventDefault();
				//Next Page
				if($this.set.filteredBy.page < $this.set.pages) {
					$this.set.filteredBy.page += 1;
					$this.set.currentHash = priv.hashify($this.set.filteredBy);
					if($this.set.currentHash.length > 0) window.location.hash = $this.set.currentHash;
					$this.find('.current-page').text($this.set.filteredBy.page);
					priv.gatherItems.apply($this);
				}
				return false;
			});

			$this.on('click', '.prev', function(e) {
				e.preventDefault();
				//Prev Page
				if($this.set.filteredBy.page > 1) {
					$this.set.filteredBy.page -= 1;
					$this.set.currentHash = priv.hashify($this.set.filteredBy);
					if($this.set.currentHash.length > 0) window.location.hash = $this.set.currentHash;
					$this.find('.current-page').text($this.set.filteredBy.page);
					priv.gatherItems.apply($this);
				}
			});

			$this.on('click', '.all', function(e) {
				e.preventDefault();
				var $paging = $(this).closest('.paging');
				//Prev Page
				if($paging.hasClass('viewing-all')) {
					$this.set.limit = $this.set.oldLimit;
					$paging.removeClass('viewing-all');
					$this.find('.current-page').text($this.set.filteredBy.page);
				} else {
					$this.set.oldLimit = $this.set.limit;
					$this.set.limit = 'none';
					$paging.addClass('viewing-all');
					$this.find('.current-page').text(1);
				}
				priv.gatherItems.apply($this);
			});

		},
		reSelectLatestFilter: function() {
			var $this = this;

			//Previous latestCat
			for(var firstCat in $this.set.filteredBy) {
				if(filter === 'page' || filter === 'sort') continue;
				$this.set.latestCat = firstCat;
				break;
			}

		},
		updateFilter: function(type, cat, val) {
			//Updates filter object.
			var $this = this,
				currVal = null,
				posInArray = null;

			if(type === 's1' || type === 's') {
				//Select One
				if($this.set.filteredBy[cat] !== undefined && ($this.set.filteredBy[cat].value === val || val === 0 || val === '0' || val === 'remove')) {
					delete $this.set.filteredBy[cat];
					priv.reSelectLatestFilter.apply($this);
				} else {
					$this.set.filteredBy[cat] = {type: type, value: val};
				}
			} else if(type === 'sand' || type === 'sor') {
				//Select And || Select Or
				if(val === 'remove') {
					//If remove, remove all and only if it has been set.
					if($this.set.filteredBy[cat] !== undefined) {
						delete $this.set.filteredBy[cat];
						priv.reSelectLatestFilter.apply($this);
					}
				} else if(val === null) {
					//if multiple select is emtpy it returns val() as null.
					delete $this.set.filteredBy[cat];
					priv.reSelectLatestFilter.apply($this);

				} else if(typeof val === 'object') {
					//Multiple select returns val() as an array.
					if(val.length > 0) {
						$this.set.filteredBy[cat] = {type: type, value: val};
					}

				} else {
					currVal = $this.set.filteredBy[cat] !== undefined && $this.set.filteredBy[cat].value !== undefined ? $this.set.filteredBy[cat].value : [];
					posInArray = $.inArray(val, currVal);

					if(posInArray !== -1 || val === 0 || val === '0') {
						currVal.splice(posInArray, 1);
					} else {
						currVal.push(val);
					}

					if(currVal.length > 0) {
						$this.set.filteredBy[cat] = {type: type, value: currVal};
					} else {
						delete $this.set.filteredBy[cat];
						priv.reSelectLatestFilter.apply($this);
					}
				}
			}

			if($this.set.debug === true) console.log('var $this.set.filteredBy', $this.set.filteredBy);

			//Filter has changed reset to page 1
			$this.set.filteredBy.page = 1;
			
			//Update Hash - hashify object
			$this.set.currentHash = priv.hashify($this.set.filteredBy);
			window.location.hash = $this.set.currentHash;

			//Gather items from each filter.
			priv.gatherItems.apply($this);
			
			//Filter items have changed do callback. 
			if($this.set.onFilterChanged !== undefined) $this.set.onFilterChanged();


			if($this.set.updateWHash !== false) {
				$('.' + $this.set.updateWHash).each(function() {
					var href = $(this).attr('href');
					$(this).attr('href', href + '#' + $this.set.currentHash);
				}) ;
			}
		},
		reSelect: function() {
			//Show correct values on filter based on hash load.
			var $this = this,
				filteredBy = $this.set.filteredBy,
				$filter = {},
				$filterOpt = {},
				filterVal = '',
				type = '';

			for(var filter in filteredBy) {
				$filter = $this.find('#' + filter);
				filterVal = filteredBy[filter].value;
				type = $filter.data('create');
				if($filter.length === 0) continue;
				if(filter === 'sort') filterVal = filteredBy[filter].value.join('-');

				if(typeof filteredBy[filter].value === 'object' && filter !== 'sort') {
					for(var i = 0; i < filteredBy[filter].value.length; i++) {
						if(type === 'select' || type === 'multiSelect') {
							$filter.find('#' + filter + '-' + filteredBy[filter].value[i]).attr('selected', true);
						} else {
							$filter.find('#' + filter + '-' + filteredBy[filter].value[i]).addClass($this.set.filterSelectedClass);
						}
					}
				} else {
					$filterOpt = $filter.find('#' + filter + '-' + filterVal);

					if(type === 'select' || type === 'multiSelect') {
						$filterOpt.attr('selected', true);
					} else if(type === 'fakeSelect') {
						$filterOpt.addClass('selected');
						$filter.find('.fake-select').addClass('selected').find('span').text($filterOpt.text());
					} else {
						$filterOpt.addClass($this.set.filterSelectedClass);
					}
				}
			}

			//Filter items have changed do callback. 
			if($this.set.onFilterChanged !== undefined) $this.set.onFilterChanged();

		},
		gatherItems: function() {
			//Collect all items to be printed out based on filter.
			var $this = this,
				filteredBy = $this.set.filteredBy,
				paramTypes = $this.filter.desc.param_types,
				totalItems = $this.filter.total_items,
				filters = 0,
				i = 0,
				tmpArr = [],
				newItems = [],
				renderItems = [];

			//Could build on previous items to be even quicker? Instead of parsing the whole object...
			for(var filter in filteredBy) {
				//Runs per set of filters.
				if(filter === 'page' || filter === 'sort') continue;
				if(filteredBy[filter].type === 's1') {
					newItems = $this.filter.total_items[filter][filteredBy[filter].value];
				} else if(filteredBy[filter].type === 'sor') {
					//Concatente all arrays
					//Product only needs to match one value.
					for (i = 0; i < filteredBy[filter].value.length; i++) {
						//Runs per set of values in a filter.
						tmpArr[i] = $this.filter.total_items[filter][filteredBy[filter].value[i]];
					}
					//Join them together to create newItems.
					newItems = Array.prototype.concat.apply([], tmpArr);
				} else if(filteredBy[filter].type === 'sand') {
					//Intersect all arrays
					//All values must be present to show product.
					for (i = 0; i < filteredBy[filter].value.length; i++) {
						//TODO: run intersect on arrays
						tmpArr[i] = $this.filter.total_items[filter][filteredBy[filter].value[i]];
						newItems = newItems;
					}
				}
				//There are still items that should be excluded.
				//Need to know if the items should be subtracted from the total or added between groups.
				//Only adds newItems if it is the first filter.
				renderItems = filters === 0 ? newItems : priv.intersect(renderItems, newItems);
				tmpArr = [];
				filters++;
			}

			if(filters === 0) {
				//Same here if the intersect returns nothing.
				//Clone filter items to return everything back to original state.
				//Objects retain references
				$this.set.currentItems = $this.filter.items.slice(0);
				$this.find('.filter-group').find('.disabled,.' + $this.set.filterSelectedClass).removeClass('disabled ' + $this.set.filterSelectedClass);
				$this.find('.filter-group option').removeAttr('disabled').filter(':selected').removeAttr('selected');
			} else {

				//Disable options in the other filters
				//Now we should know which products are left and be able to see if they are available in the other filters.
				//Latest filter show all from that filter (skip it then).
				for (i = 0; i < paramTypes.length; i++) {
					//Don't change the category we're in.
					//If only one filter is chosen, remove disabled on that one remove latestCat
					//Previous filter.

					if($this.set.latestCat !== paramTypes[i]) {
						var catTotal = 0,
							$item = {},
							prop = '';

						tmpArr = [];

						for(var subCat in totalItems[paramTypes[i]]) {
							//Do these sub categories have any of our items?
							$item = $this.find('#' + paramTypes[i] + '-' + subCat);
							if($item.length === 0) continue;
							prop = $item.prop('tagName').toLowerCase();

							tmpArr = priv.intersect(renderItems, totalItems[paramTypes[i]][subCat]);
							//console.log('category: ', subCat, ' items: ', tmpArr);
							if(tmpArr.length > 0) {
								//Items in that category make available
								if(prop === 'option' || prop === 'input') {
									//Remove attr disabled
									$item.removeAttr('disabled');
								} else {
									//Remove class disabled
									$item.removeClass('disabled').attr('title', tmpArr.length);
								}
								catTotal += tmpArr.length;
							} else {
								//Disable category no items for that option.
								if(prop === 'option' || prop === 'input') {
									$item.attr('disabled', true);
								} else {
									$item.addClass('disabled').removeAttr('title');
								}
							}
						}

						//If the whole category is empty hide category.
						if(catTotal > 0) {
							$this.find('#' + paramTypes[i]).removeClass('disabled').attr('title', catTotal);
						} else {
							$this.find('#' + paramTypes[i]).addClass('disabled').removeAttr('title');
						}
					}
				}


				//Modify array keys to return item objs show only unique items.
				renderItems = priv.unique(renderItems);
				$this.set.currentItems = priv.keysToItems.apply($this, [renderItems]);
			}

			if($this.set.filteredBy.sort !== undefined && $this.set.currentItems.length > 0) {
				priv.sortItems.apply($this);
			} else {
				priv.renderItems.apply($this);
			}
		},
		sortItems: function() {
			var $this = this,
				items = $this.set.currentItems,
				itemsLen = items.length,
				sortBy = $this.set.filteredBy.sort.value[0],
				i = 0,
				sortArr = [];


			for (i = 0; i < itemsLen; i++) {
				//Create array
				sortArr[i] = {obj: items[i]};
				if(sortBy === 'price') {
					sortArr[i][sortBy] = parseInt(items[i].price.replace('&#160;', ''));
				} else if(sortBy === 'news') {
					sortArr[i][sortBy] = items[i].newsmarker !== undefined ? 0 : 10;
				} else {
					//Sort alphabetically
					sortArr[i][sortBy] = items[i][sortBy];
				}
			}

			if(typeof sortArr[0][sortBy] === 'number') {
				sortArr.sort(function(a,b) { 
					return a[sortBy] - b[sortBy];
				});
			} else {
				sortArr.sort(function(a,b) {
					if(a[sortBy] < b[sortBy] || b[sortBy] === '') return -1;
					if(a[sortBy] > b[sortBy]) return 1;
					return 0;
				});
			}

			if($this.set.filteredBy.sort.value[1] === 'dsc') sortArr.reverse();

			//Clean array before reloading objects
			$this.set.currentItems = [];
			for (i = 0; i < itemsLen; i++) {
				$this.set.currentItems[i] = sortArr[i].obj;
			}

			priv.renderItems.apply($this);
		},
		renderItems: function() {
			//Filter out correct products to be shown
			//Only unique items
			var $this = this,
				items = $this.set.currentItems,
				len = items.length,
				range = null,
				start = 0,
				html = '';

			if($this.set.limit !== 'none') {

				if(len > $this.set.limit) {
					$this.set.pages = Math.ceil(len / $this.set.limit);
					$this.find('.paging').removeClass('disabled');
					range = $this.set.limit * $this.set.filteredBy.page;
					start = ($this.set.filteredBy.page - 1) * $this.set.limit;
					len = (range > items.length) ? start + (items.length % $this.set.limit) : range;
					if($this.set.filteredBy.page > 1) {
						$this.find('.prev').closest('.paging').removeClass('disabled');
					} else {
						$this.find('.prev').closest('.paging').addClass('disabled');
					}
					if(len !== range) {
						//assume we are on the last page.
						$this.find('.paging').addClass('disabled');
					}
				} else {
					$this.set.pages = 1;
					$this.find('.paging').addClass('disabled');
					$this.find('.prev').closest('.paging').addClass('disabled');
				}

			} else {
				$this.set.pages = 1;
			}

			$this.find('.page-total').text($this.set.pages);

			for (var i = start; i < len; i++) {
				//Chance to add more items to the object. Must also be in the template.
				if($this.set.eachItemAttrs) items[i] = $this.set.eachItemAttrs($this, items[i], i);
				html += priv.renderItemTemplate.apply($this, [items[i]]);
			}

			if($this.set.appendItems && $this.set.pages !== 1 && $this.set.filteredBy.page !== 1) {
				$this.find('#' + $this.set.itemContId).append(html);
			} else {
				$this.find('#' + $this.set.itemContId).html(html);
			}
			
			if($this.set.afterItemsRendered !== undefined) $this.set.afterItemsRendered();
		},
		renderItemTemplate: function(obj) {
			//Optimized: jsperf test http://jsperf.com/replace-function-or-several-replaces
			//Parse template add data.
			//use text between {} as keys.
			var $this = this,
				template = $this.filter.templates.item,
				images = [],
				numImages = 0,
				clearImageLine = false,
				imageStr = '',
				variations = obj.variations !== undefined ? obj.variations : false,
				varArr = [],
				len = images.length;
			
			if($this.set.debug === true && typeof images !== 'object') { console.warn('You should be using the latest version of the JSFilter class. Incl in v2'); }

			if(variations !== false) {
				//Create an array of the product variations.
				for (var i = 0; i < variations.length; i++) {
					varArr[i] = variations[i].id;
				}

				//Use only main product array / first in varArr 
				if(obj.image[varArr[0]]) {
					images = obj.image[varArr[0]];
				} else if(obj.image[0]) {
					images = obj.image[0];
				} else {
					images = obj.image[-1];
				}

			} else {
				images = obj.image[0];
				
				if(typeof obj.image == 'object' && images === undefined) {
					for(var imageArr in obj.image) {
						images = obj.image[imageArr];
					}
				}
			}

			obj.hash = $this.set.currentHash.indexOf('#') === -1 ? '#' + $this.set.currentHash : $this.set.currentHash;

			//Split URI's if needed
			obj.category_uri = (obj.category_uri === null) ? '' : (obj.category_uri.indexOf(':') !== -1) ? obj.category_uri.slice(0,obj.category_uri.indexOf(':')) : obj.category_uri;
			obj.root_uri = (obj.root_uri === null) ? '' : (obj.root_uri.indexOf(':') !== -1) ? obj.root_uri.slice(0,obj.root_uri.indexOf(':')) : obj.root_uri;

			if(template.indexOf('{rep_') !== -1) {
				template = template.replace(/<[^<]*(\{rep_(.+?)\})[^>]*>/g, function(value, sel, text) {
					var str = '',
						end = '</' + value.match(/<([a-z]+)/)[1] + '>';
					for (var i = 0; i < varArr.length; i++) {
						if(obj[text] !== undefined && obj[text][varArr[i]] !== undefined) {
							str += value.replace(sel, obj[text][varArr[i]]) + end;
						}
					}
					return str;
				});
			}

			template = template.replace(/\{(.+?)\}/g, function(value, text) {
				//Replace text with property only if property exists.
				//Special logic for not enough images to fill html.
				var str = '';
				if(text.substring(0,6) === 'image_') {
					var pos = parseInt(text.substring(6)) - 1;
					str = images[pos];
					if(str === undefined) {
						clearImageLine = true;
						return '{#}';
					}
				} else {
					str = obj[text] !== undefined ? obj[text] : '';
				}
				return str;
			});

			if(clearImageLine) template = template.replace(/<[^<]*\{#\}[^>]*>/g, '');

			return template;
		},
		keysToItems: function(arr) {
			var $this = this,
				newArr = [],
				item = '';

			for (var i = 0; i < arr.length; i++) {
				item = $this.filter.items_keys[arr[i]];
				newArr[i] = $this.filter.items[item];
			}

			return newArr;
		},
		//Helper functions
		unique: function(a)  {
			//Optimized: jsperf test http://jsperf.com/hash-sieving/3
			//Returns an array with only unique values
			var na = [];
			lbl:for(var i = 0; i < a.length; i++) {
				for(var j = 0; j < na.length; j++) {
					if(na[j] == a[i])
						continue lbl;
				}
				na[na.length] = a[i];
			}
			return na;
		},
		intersect: function(a, b) {
			//Optimized: jsperf test http://jsperf.com/replace-function-or-several-replaces
			//Only choose items that are in both arrays (a and b)
			//Returns array
			var inter = [], inA = {}, i = 0;

			for (i = 0; i < a.length; i++) {
				inA[a[i]] = true;
			}
			for(i = 0; i < b.length; i++) {
				if(inA[b[i]]) inter[inter.length] = b[i];
			}
			return inter;
		},
		dehashify: function(str) {
			//Returns obj
			var $this = this,
				obj = {},
				filters = str.substring(1).split('&'),
				tmpArr = [],
				type = '',
				firstFilter = true,
				value = null;
				
			if(str.length > 1) {
				for (var i = 0; i < filters.length; i++) {
					tmpArr = filters[i].split('=');
					if(tmpArr[0] === 'page') {
						obj.page = parseInt(tmpArr[1]);
					} else {
						type = tmpArr[0].split('~');
						switch (type[1]) {
							case 'sand':
								value = tmpArr[1].split('+');
								break;
							case 'sor':
							case 'r':
							case 's':
							case 'f':
								value = tmpArr[1].split(',');
								break;
							default:
								value = tmpArr[1];
								break;
						}
						if(firstFilter && type[0] !== 'sort') {
							firstFilter = false;
							$this.set.latestCat = type[0];
						}
						obj[type[0]] = {type: type[1], value: value};
					}
				}
			}
			
			//Set page number if not set.
			if(obj.page === undefined) obj.page = 1;

			return obj;
		},
		hashify: function(obj) {
			//Returns str
			var strHash = '',
				value = null;

			for (var filter in obj) {
				//Handling of arrays of values.
				if(filter === 'page') {
					if(obj[filter] > 1) strHash += filter + '=' + obj[filter] + '&';
				} else {
					switch (obj[filter].type) {
						case 'sand':
							value = obj[filter].value.join('+');
							break;
						case 'sor':
						case 's':
						case 'r':
						case 'f':
							value = obj[filter].value.join(',');
							break;
						default:
							value = obj[filter].value;
							break;
					}
					strHash += filter + '~' + obj[filter].type + '=' + value + '&';
				}
			}
			return strHash.substring(0, strHash.length - 1);
		},
		urlify: function(str) {
			//Returns str
			return str.toLowerCase().replace(/\s{2,}|\s/g,'-');
		}
	};

	var methods = {
		init: function(options) {

			var init = $.extend({}, defaultOpts, options);
			
			window.requestAnimFrame = (function() { return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) { window.setTimeout(callback, 1000 / 60); }; })();

			return this.each(function() {
				var $this = $(this),
					objectData = $this.data();

				$this.set = $.extend({}, init, objectData, privateOpts);

				if($this.set.debug === true) {
					console.warn(':::: YS Filter Debug has been set to true ::::');
					console.log('Options -> ', $this.set);

					if($this.set.url === undefined) {
						console.warn('No url has been defined i.e. loadproducts/category?search=');
					}
				}

				priv.init.apply($this);
				$this.data($this.set);

			});
		}
	};

	var defaultOpts = {
		limit: 20,
		splitSizes: false,
		appendItems: false,
		multipleImgs: false,
		filterOptions: {},
		updateWHash: false,
		itemContId: 'item-cont',
		filterSelectedClass: 'selected',
		groupClass: 'filter-group'
	};

	var privateOpts = {
		filteredBy: {},
		currentHash: '',
		latestCat: '',
		currentItems: [],
		oldLimit: null,
		pages: 1
	};

	$.fn.ysFilter = function(method) {

		//arguments local variable to all functions.
		if (methods[method]) {
			//If explicitly calling a method.
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			//If method is an "object" (can also be an array) or no arguments passed to the function.
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method ' +  method + ' does not exist on jQuery.ysFilter');
		}

	};

})(jQuery, window);