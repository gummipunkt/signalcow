const gulp = require('gulp');
const nodemon = require('gulp-nodemon');
const shell = require('gulp-shell');
const path = require('path'); // Added for path resolution
const eslint = require('gulp-eslint-new'); // For ESLint task

const backendDir = __dirname;
const frontendDir = path.join(__dirname, '../frontend');

// Task to start the backend server with Nodemon
gulp.task('serve:backend', () => {
  return nodemon({
    script: 'server.js', // Your main server file
    ext: 'js json',     // Watch for changes in these file types
    ignore: ['node_modules/', 'gulpfile.js', 'migrations/', path.join(frontendDir, '**')], // Ignore these paths and the frontend dir
    env: { 'NODE_ENV': 'development' },
    cwd: backendDir
  });
});

// Task to run database migrations (up)
// Ensures the command is run in the backend directory
gulp.task('migrate:up', shell.task('npm run migrate:up', { cwd: backendDir }));

// Task to run database migrations (down)
// Ensures the command is run in the backend directory
gulp.task('migrate:down', shell.task('npm run migrate:down', { cwd: backendDir }));
https://www.spiegel.de/
// --- Linting Task ---
gulp.task('lint:backend', () => {
  // Ensure you have an ESLint configuration file (e.g., .eslintrc.js) in the backend directory
  // Adjust the src glob pattern as needed, excluding node_modules, this gulpfile, and migrations
  return gulp.src([
    `${backendDir}/**/*.js`,
    `!${backendDir}/node_modules/**`,
    `!${backendDir}/gulpfile.js`,
    `!${backendDir}/migrations/**`
  ])
    .pipe(eslint({ overrideConfigFile: path.join(backendDir, '.eslintrc.js') }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

// --- Frontend Tasks ---

// Task to start the Next.js development server for the frontend
gulp.task('serve:frontend', shell.task('npm run dev', { 
  cwd: frontendDir,
  // Optionally, you can try to add a prefix to the output to distinguish from backend logs
  // This depends on gulp-shell's capabilities and might need a different approach for complex logging.
  // verbose: true, // May help see output
  // templateData: { prefix: '[Frontend]' } // This is a guess, check gulp-shell docs if needed
}));

// Task to build the frontend for production
gulp.task('build:frontend', shell.task('npm run build', { cwd: frontendDir }));

// Task to start the frontend production server
gulp.task('start:frontend', shell.task('npm run start', { cwd: frontendDir }));

// --- Combined Tasks ---

// Default task: Starts only the backend server (to keep it simple)
gulp.task('default', gulp.series('serve:backend'));

// Development task: Starts both backend and frontend development servers in parallel
// It also runs backend linting first.
// If linting fails, a Gulp error will prevent subsequent tasks in the series from running.
gulp.task('dev', gulp.series('lint:backend', gulp.parallel('serve:backend', 'serve:frontend')));

console.log("Gulpfile loaded. Available tasks:");
console.log("- gulp default: Starts the backend server with Nodemon.");
console.log("- gulp serve:backend: Starts the backend server with Nodemon.");
console.log("- gulp lint:backend: Lints backend JavaScript files.");
console.log("- gulp serve:frontend: Starts the Next.js frontend dev server.");
console.log("- gulp dev: Lints backend, then starts backend and frontend dev servers.");
console.log("- gulp migrate:up: Runs database migrations (up).");
console.log("- gulp migrate:down: Runs database migrations (down).");
console.log("- gulp build:frontend: Builds the frontend for production.");
console.log("- gulp start:frontend: Starts the frontend production server.");
