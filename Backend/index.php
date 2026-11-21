<?php
require __DIR__ . '/lib.php';
$p = $_GET['p'] ?? 'home';
$nav = ['home' => 'Dashboard', 'students' => 'Students', 'specs' => 'Specializations',
        'criteria' => 'Criteria', 'eval' => 'Evaluations', 'result' => 'Results'];
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DSS - Specialization Selection</title><link rel="stylesheet" href="style.css"></head><body>
<header><h1>DSS · Specialization Selection</h1><nav>
<?php foreach ($nav as $k => $l) echo '<a href="?p=' . $k . '"' . ($p === $k ? ' class="on"' : '') . '>' . $l . '</a>'; ?>
</nav></header><main>
<?php
try {
    $pdo = db();
    switch ($p) {
    case 'students':
        echo '<h2>Students</h2>';
        crud('students', ['full_name' => ['Full name', 'text', true], 'email' => ['Email', 'email', false],
                          'academic_average' => ['Average (0-20)', 'number', false, '0.01']]);
        break;
    case 'specs':
        echo '<h2>Specializations</h2>';
        crud('specializations', ['code' => ['Code', 'text', true], 'name' => ['Name', 'text', true],
                                 'description' => ['Description', 'text', false]]);
        break;
    case 'criteria':
        echo '<h2>Criteria and weights</h2>';
        crud('criteria', ['name' => ['Name', 'text', true], 'type' => ['Type', 'select', true, ['MAX', 'MIN']],
                          'weight' => ['Weight (0-1)', 'number', true, '0.001']]);
        $sum = (float)$pdo->query('SELECT COALESCE(SUM(weight),0) FROM criteria')->fetchColumn();
        $ok = abs($sum - 1) < 0.0001;
        echo '<p class="' . ($ok ? 'ok' : 'err') . '">Total weight: ' . number_format($sum, 3) . ($ok ? ' (valid)' : ' (must equal 1.000)') . '</p>';
        break;
    case 'eval':
        echo '<h2>Evaluations (1 to 10)</h2>';
        $sid = (int)($_GET['s'] ?? 0); picker('eval', $sid);
        if (!$sid) break;
        $sp = $pdo->query('SELECT id, code, name FROM specializations ORDER BY id')->fetchAll();
        $cr = $pdo->query('SELECT id, name, type FROM criteria ORDER BY id')->fetchAll();
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $bad = false;
            foreach ($_POST['v'] ?? [] as $row) foreach ($row as $x) if (!ctype_digit((string)$x) || $x < 1 || $x > 10) $bad = true;
            if ($bad) echo '<p class="err">All scores must be integers from 1 to 10.</p>';
            else {
                $q = $pdo->prepare('INSERT INTO evaluations(student_id,specialization_id,criterion_id,value) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)');
                foreach ($_POST['v'] as $a => $row) foreach ($row as $c => $x) $q->execute([$sid, $a, $c, $x]);
                echo '<p class="ok">Evaluations saved.</p>';
            }
        }
        $q = $pdo->prepare('SELECT specialization_id a, criterion_id c, value v FROM evaluations WHERE student_id=?');
        $q->execute([$sid]); $cur = [];
        foreach ($q->fetchAll() as $r) $cur[$r['a']][$r['c']] = $r['v'];
        echo '<form method="post"><table><tr><th>Specialization</th>';
        foreach ($cr as $c) echo '<th>' . h($c['name']) . '<br><small>' . $c['type'] . '</small></th>';
        echo '</tr>';
        foreach ($sp as $s) {
            echo '<tr><td>' . h($s['code'] . ' ' . $s['name']) . '</td>';
            foreach ($cr as $c) echo '<td><input type="number" min="1" max="10" required name="v[' . $s['id'] . '][' . $c['id'] . ']" value="' . h($cur[$s['id']][$c['id']] ?? '') . '"></td>';
            echo '</tr>';
        }
        echo '</table><button>Save evaluations</button></form>';
        break;
    case 'result':
        echo '<h2>Results</h2>';
        $sid = (int)($_GET['s'] ?? 0); picker('result', $sid);
        if (!$sid) break;
        $cr = $pdo->query('SELECT id, name, type, weight FROM criteria ORDER BY id')->fetchAll();
        $sp = $pdo->query('SELECT id, code, name FROM specializations ORDER BY id')->fetchAll();
        $q = $pdo->prepare('SELECT specialization_id a, criterion_id c, value v FROM evaluations WHERE student_id=?');
        $q->execute([$sid]); $rows = $q->fetchAll(); $m = [];
        foreach ($rows as $r) $m[$r['a']][$r['c']] = $r['v'];
        $sum = array_sum(array_column($cr, 'weight'));
        if (abs($sum - 1) > 0.0001) { echo '<p class="err">Weights sum to ' . number_format($sum, 3) . ' but must equal 1. Fix them in Criteria.</p>'; break; }
        if (count($rows) < count($sp) * count($cr)) { echo '<p class="err">Evaluations are incomplete. Fill every score in Evaluations first.</p>'; break; }
        $names = array_column($sp, 'name', 'id');
        $rk = rankScores(weightedSum($cr, $m));
        $best = array_values(array_filter($rk, fn($r) => $r['rank'] === 1));
        if (count($best) > 1)
            echo '<p class="tie"><b>Tie for first place</b> (score ' . number_format($best[0]['score'], 4) . '): ' . h(implode(' and ', array_map(fn($r) => $names[$r['id']], $best))) . '</p>';
        else
            echo '<p class="win"><b>Recommended specialization:</b> ' . h($names[$best[0]['id']]) . ' (score ' . number_format($best[0]['score'], 4) . ')</p>';
        echo '<h3>Ranking</h3><table><tr><th>Rank</th><th>Specialization</th><th>Overall score</th><th>Note</th></tr>';
        foreach ($rk as $r)
            echo '<tr' . ($r['rank'] === 1 ? ' class="top"' : '') . '><td>' . $r['rank'] . '</td><td>' . h($names[$r['id']]) . '</td><td>' . number_format($r['score'], 4) . '</td><td>' . ($r['tie'] ? 'Tie' : '') . '</td></tr>';
        echo '</table><h3>Normalized values (0 to 1)</h3><table><tr><th>Specialization</th>';
        foreach ($cr as $c) echo '<th>' . h($c['name']) . '<br><small>' . $c['type'] . ' · w=' . $c['weight'] . '</small></th>';
        echo '</tr>';
        foreach ($sp as $s) {
            echo '<tr><td>' . h($s['code']) . '</td>';
            foreach ($cr as $c) echo '<td>' . number_format(normalize((float)$m[$s['id']][$c['id']], $c['type']), 3) . '</td>';
            echo '</tr>';
        }
        echo '</table><h3>Chart</h3><canvas id="chart" height="110"></canvas>'
           . '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script><script>new Chart(document.getElementById("chart"),{type:"bar",data:{labels:'
           . json_encode(array_map(fn($r) => $names[$r['id']], $rk), JSON_HEX_TAG | JSON_HEX_AMP) . ',datasets:[{label:"Overall score",data:'
           . json_encode(array_column($rk, 'score')) . ',backgroundColor:"#2F6DB5"}]},options:{scales:{y:{min:0,max:1}}}});</script>';
        break;
    default:
        $c = $pdo->query('SELECT (SELECT COUNT(*) FROM students) s, (SELECT COUNT(*) FROM specializations) p, (SELECT COUNT(*) FROM criteria) c, (SELECT COUNT(*) FROM evaluations) e')->fetch();
        echo '<h2>Dashboard</h2><div class="stats"><div><b>' . $c['s'] . '</b>Students</div><div><b>' . $c['p'] . '</b>Specializations</div><div><b>' . $c['c'] . '</b>Criteria</div><div><b>' . $c['e'] . '</b>Evaluations</div></div>'
           . '<p>Steps: 1) check Criteria and weights, 2) add a Student, 3) fill the Evaluations grid, 4) open Results.</p>';
    }
} catch (Throwable $e) {
    echo '<p class="err">Database error. Check config.php and that schema.sql was imported.</p>';
}
?>
</main></body></html>
