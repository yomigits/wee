(function(W, U) {
	'use strict';

	W.fn.make('assets', {
		// Cache pre-existing CSS and JavaScript asset references
		_construct: function() {
			this.loaded = {};

			W.$each('link[rel="stylesheet"], script[src]', function(el) {
				this.loaded[el.href || el.src] = el;
			}, {
				scope: this
			});
		},
		// Get currently bound resource root or set root with specified value
		// Returns string
		root: function(value) {
			return value ? this.$set('.', value) : this.$get('.', '');
		},
		// Load specified assets with specified set of options
		load: function(options) {
			var conf = W.$extend({
					files: [],
					js: [],
					css: [],
					img: []
				}, options),
				files = W.$toArray(conf.files),
				js = W.$toArray(conf.js),
				css = W.$toArray(conf.css),
				img = W.$toArray(conf.img),
				root = conf.root !== U ? conf.root : this.root(),
				now = new Date().getTime(),
				i = 0,
				type;

			// Create group name if not specified
			if (! conf.group) {
				conf.group = 'load-' + now;
			}

			// Determine file type
			var assets = [];

			for (; i < files.length; i++) {
				var ext = files[i].split('.').pop().split(/\#|\?/)[0];
				type = (ext == 'js' || ext == 'css') ?
					ext : (/(gif|jpe?g|png|svg)$/i).test(ext) ?
						'img' : '';

				if (type) {
					assets[files[i]] = type;
				}
			}

			for (i = 0; i < js.length; i++) {
				assets[js[i]] = 'js';
			}

			for (i = 0; i < css.length; i++) {
				assets[css[i]] = 'css';
			}

			for (i = 0; i < img.length; i++) {
				assets[img[i]] = 'img';
			}

			// Set file array length to check against
			this.$set(conf.group, Object.keys(assets).length);
			this.$set(conf.group + 'fail', 0);
			this.$set(conf.group + 'conf', conf);

			// Request each specified file
			for (var file in assets) {
				type = assets[file];
				file = root + file;

				if (! this.loaded[file]) {
					if (conf.cache === false) {
						file += (file.indexOf('?') < 0 ? '?' : '&') + now;
					}

					this.$private('load', file, type, conf);
				}
			}
		},
		// Remove one or more files from the DOM
		remove: function(files, root) {
			files = W.$toArray(files);
			root = root || '';

			var keys = Object.keys(files),
				a = W._doc.createElement('a'),
				i = 0;

			for (; i < keys.length; i++) {
				var key = keys[i],
					src = root + files[key];
				a.href = src;
				src = a.href;

				var el = this.loaded[src];

				if (el !== U) {
					el.parentNode.removeChild(el);
					el = null;
					delete this.loaded[src];
				}
			}
		},
		// When specified references are ready execute callback
		ready: function(group, options, poll) {
			if (this.$get(group) === 0) {
				var conf = W.$extend(this.$get(group + 'conf'), options);
				options = {
					args: conf.args,
					scope: conf.scope
				};

				if (conf.failure && this.$get(group + 'fail') > 0) {
					W.$exec(conf.failure, options);
				} else if (conf.success) {
					W.$exec(conf.success, options);
				}
			} else if (poll) {
				setTimeout(function() {
					W.assets.ready(group, {}, true);
				}, 20);
			}
		}
	}, {
		// Request specific file
		load: function(path, type, conf) {
			var scope = this,
				pub = scope.$public,
				head = W._doc.getElementsByTagName('head')[0],
				group = conf.group,
				img = new Image();

			// Load file based on extension
			if (type == 'js') {
				var js = W._doc.createElement('script');

				js.src = path;
				js.async = conf.async === true;

				js.onload = js.onreadystatechange = function() {
					var rs = js.readyState;

					if (rs && rs != 'complete' && rs != 'loaded') {
						return;
					}

					pub.loaded[js.src] = js;
					scope.done(group);
				};

				js.onerror = function() {
					scope.fail(group);
				};

				head.appendChild(js);
			} else if (type == 'css') {
				var link = W._doc.createElement('link');

				link.rel = 'stylesheet';
				link.href = path;

				head.appendChild(link);

				img.onerror = function() {
					pub.loaded[link.href] = link;
					scope.done(group);
				};

				img.src = path;
			} else if (type == 'img') {
				img.onload = function() {
					scope.done(group);
				};

				img.onerror = function() {
					scope.fail(group);
				};

				img.src = path;
			}
		},
		// Decrement remaining count of assets to be loaded
		done: function(group) {
			this.$set(group, this.$get(group) - 1);
			this.$public.ready(group, {}, false);
		},
		// Track failed resources
		fail: function(group) {
			var key = group + 'fail';

			this.$set(key, this.$get(key) + 1);
			this.done(group);
		}
	});
})(Wee, undefined);