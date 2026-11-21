<?php
require __DIR__ . '/config.php';

function db(): PDO {
    static $pdo;
    return $pdo ??= new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
}
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

/* ---------- Decision engine: Weighted Sum Model (pure functions, no database) ---------- */
function normalize(float $x, string $type): float {          // scale 1..10 -> 0..1
    return $type === 'MIN' ? (10 - $x) / 9 : ($x - 1) / 9;
}
function weightedSum(array $criteria, array $matrix): array { // $matrix[specId][critId] = value
    $scores = [];
    foreach ($matrix as $sid => $vals) {
        $t = 0;
        foreach ($criteria as $c) $t += $c['weight'] * normalize((float)$vals[$c['id']], $c['type']);
        $scores[$sid] = round($t, 4);                          // rounding avoids float false differences
    }
    return $scores;
}
function rankScores(array $scores): array {                    // descending, same rank for ties
    arsort($scores);
    $out = []; $i = 0; $prev = null; $rank = 0;
    foreach ($scores as $id => $s) {
        $i++;
        if ($prev === null || $s !== $prev) $rank = $i;
        $out[] = ['id' => $id, 'score' => $s, 'rank' => $rank];
        $prev = $s;
    }
    $cnt = array_count_values(array_map(fn($r) => (string)$r['score'], $out));
    foreach ($out as &$r) $r['tie'] = $cnt[(string)$r['score']] > 1;
    return $out;
}

/* ---------- UI helpers ---------- */
function field(string $k, array $d, $val): void {              // $d = [label, type, required, extra]
    [$l, $t, $r] = $d; $o = $d[3] ?? null;
    echo '<label>' . $l;
    if ($t === 'select') {
        echo '<select name="' . $k . '">';
        foreach ($o as $x) echo '<option' . ($x == $val ? ' selected' : '') . '>' . h($x) . '</option>';
        echo '</select>';
    } else {
        echo '<input type="' . $t . '" name="' . $k . '" value="' . h($val) . '"' . ($r ? ' required' : '')
           . ($t === 'number' ? ' step="' . ($o ?? 'any') . '"' : '') . '>';
    }
    echo '</label>';
}
function picker(string $page, int $sid): array {
    $st = db()->query('SELECT id, full_name FROM students ORDER BY full_name')->fetchAll();
    echo '<form method="get" class="card"><input type="hidden" name="p" value="' . $page . '"><label>Student<select name="s" onchange="this.form.submit()"><option value="">-- choose --</option>';
    foreach ($st as $s) echo '<option value="' . $s['id'] . '"' . ($s['id'] == $sid ? ' selected' : '') . '>' . h($s['full_name']) . '</option>';
    echo '</select></label></form>';
    return $st;
}
function crud(string $t, array $f): void {                     // generic add / edit / delete / list
    $pdo = db(); $p = $_GET['p']; $err = '';
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        try {
            if (isset($_POST['del'])) {
                $pdo->prepare("DELETE FROM $t WHERE id=?")->execute([$_POST['del']]);
            } else {
                $v = []; foreach ($f as $k => $d) { $x = trim($_POST[$k] ?? ''); $v[] = $x === '' ? null : $x; }
                $ks = array_keys($f);
                if (!empty($_POST['id']))
                    $pdo->prepare("UPDATE $t SET " . implode(',', array_map(fn($k) => "$k=?", $ks)) . ' WHERE id=?')->execute([...$v, $_POST['id']]);
                else
                    $pdo->prepare("INSERT INTO $t(" . implode(',', $ks) . ') VALUES(' . implode(',', array_fill(0, count($ks), '?')) . ')')->execute($v);
            }
            header("Location: ?p=$p"); exit;
        } catch (PDOException $e) { $err = 'Could not save: invalid value, duplicate, or record still in use.'; }
    }
    $edit = null;
    if (isset($_GET['edit'])) { $q = $pdo->prepare("SELECT * FROM $t WHERE id=?"); $q->execute([$_GET['edit']]); $edit = $q->fetch() ?: null; }
    if ($err) echo '<p class="err">' . $err . '</p>';
    echo '<form method="post" class="card"><input type="hidden" name="id" value="' . h($edit['id'] ?? '') . '">';
    foreach ($f as $k => $d) field($k, $d, $edit[$k] ?? '');
    echo '<button>' . ($edit ? 'Update' : 'Add') . '</button>' . ($edit ? ' <a href="?p=' . $p . '">Cancel</a>' : '') . '</form>';
    echo '<table><tr><th>#</th>'; foreach ($f as $d) echo '<th>' . $d[0] . '</th>'; echo '<th></th></tr>';
    foreach ($pdo->query("SELECT * FROM $t ORDER BY id")->fetchAll() as $r) {
        echo '<tr><td>' . $r['id'] . '</td>'; foreach ($f as $k => $d) echo '<td>' . h($r[$k]) . '</td>';
        echo '<td><a href="?p=' . $p . '&edit=' . $r['id'] . '">Edit</a> <form method="post" class="inl" onsubmit="return confirm(\'Delete?\')"><button name="del" value="' . $r['id'] . '">Delete</button></form></td></tr>';
    }
    echo '</table>';
}
