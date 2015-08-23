require('babel/register');

var gulp = require('gulp');
var babel = require('gulp-babel');
var mocha = require('gulp-mocha');

gulp.task('babel', function() {
  return gulp.src('src/**/*.es6')
    .pipe(babel())
    .pipe(gulp.dest('dist'));
});

gulp.task('test', function() {
  return gulp.src('src/**/*-test.es6', { read: false })
    .pipe(mocha({ reporter: 'list' }));
});
