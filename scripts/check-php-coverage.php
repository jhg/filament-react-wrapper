<?php

declare(strict_types=1);

if ($argc !== 3) {
    fwrite(STDERR, "Usage: php scripts/check-php-coverage.php <clover.xml> <minimum-percent>\n");
    exit(2);
}

$coverageFile = $argv[1];
$minimumPercentage = (float) $argv[2];

if (!is_file($coverageFile)) {
    fwrite(STDERR, "Coverage report not found: {$coverageFile}\n");
    exit(2);
}

libxml_use_internal_errors(true);
$coverage = simplexml_load_file($coverageFile);

if ($coverage === false || !isset($coverage->project->metrics)) {
    fwrite(STDERR, "Invalid Clover coverage report: {$coverageFile}\n");
    exit(2);
}

$metrics = $coverage->project->metrics;
$coveredStatements = (int) ($metrics['coveredstatements'] ?? 0);
$statements = (int) ($metrics['statements'] ?? 0);
$percentage = $statements > 0 ? ($coveredStatements / $statements) * 100 : 0.0;

printf(
    "PHP line coverage: %.2f%% (%d/%d statements); minimum: %.2f%%\n",
    $percentage,
    $coveredStatements,
    $statements,
    $minimumPercentage
);

if ($percentage < $minimumPercentage) {
    fwrite(STDERR, "PHP coverage is below the configured minimum.\n");
    exit(1);
}
