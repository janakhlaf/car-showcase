<?php
declare(strict_types=1);
session_start();
require_once __DIR__ . '/../config/database.php';
header('Content-Type: application/json; charset=utf-8');
$origin=$_SERVER['HTTP_ORIGIN'] ?? 'http://localhost:5173'; if(in_array($origin,['http://localhost:5173','http://127.0.0.1:5173'],true)) header('Access-Control-Allow-Origin: '.$origin);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

function out($data=null,int $status=200): never { http_response_code($status); echo json_encode(['data'=>$data],JSON_UNESCAPED_SLASHES); exit; }
function fail(string $message,int $status=400): never { http_response_code($status); echo json_encode(['error'=>$message]); exit; }
function body(): array { $raw=file_get_contents('php://input'); $v=json_decode($raw?:'{}',true); return is_array($v)?$v:[]; }
function admin(): void { if (empty($_SESSION['admin'])) fail('Unauthorized',401); }
function carRow(array $r): array { $r['id']=(int)$r['id'];$r['brandId']=(int)$r['brandId'];$r['year']=(int)$r['year'];$r['price']=(int)$r['price'];$r['featured']=(bool)$r['featured'];$r['images']=json_decode($r['images']?:'[]',true)?:[];$r['specs']=json_decode($r['specs']?:'{}',true)?:[];$r['features']=json_decode($r['features']?:'[]',true)?:[];return $r; }
$route=trim($_GET['route']??'', '/'); $method=$_SERVER['REQUEST_METHOD']; $pdo=db();

if($route==='health') out(['status'=>'ok']);
if($route==='admin/login' && $method==='POST') { $b=body();$st=$pdo->prepare('SELECT * FROM admin_users WHERE email=? LIMIT 1');$st->execute([$b['email']??'']);$u=$st->fetch();if(!$u||!password_verify($b['password']??'',$u['password_hash'])) fail('Invalid email or password',401);$_SESSION['admin']=['id'=>(int)$u['id'],'name'=>$u['name'],'email'=>$u['email']];out($_SESSION['admin']); }
if($route==='admin/logout' && $method==='POST') { session_destroy(); out(true); }
if($route==='admin/me' && $method==='GET') out($_SESSION['admin']??null);
if($route==='brands' && $method==='GET') { out($pdo->query('SELECT id,name,created_at AS createdAt FROM brands ORDER BY name')->fetchAll()); }
if($route==='brands' && $method==='POST') { admin();$b=body();$name=trim($b['name']??'');if(!$name)fail('Brand name is required');$st=$pdo->prepare('INSERT INTO brands(name) VALUES(?)');$st->execute([$name]);out(['id'=>(int)$pdo->lastInsertId(),'name'=>$name],201); }
if($route==='stats' && $method==='GET') { $cars=(int)$pdo->query('SELECT COUNT(*) FROM cars')->fetchColumn();$brands=(int)$pdo->query('SELECT COUNT(*) FROM brands')->fetchColumn();$rows=$pdo->query('SELECT specs,color FROM cars')->fetchAll();$hp=0;$colors=[];foreach($rows as $r){$s=json_decode($r['specs']?:'{}',true);$hp+=(int)($s['horsepower']??0);$colors[$r['color']]=1;}out(['carCount'=>$cars,'brandCount'=>$brands,'totalHorsepower'=>$hp,'paintShades'=>count($colors)]); }
if($route==='cars/meta' && $method==='GET') { $brands=$pdo->query('SELECT id,name FROM brands ORDER BY name')->fetchAll();$colors=$pdo->query('SELECT color, MIN(color_hex) colorHex FROM cars GROUP BY color ORDER BY color')->fetchAll();$years=$pdo->query('SELECT DISTINCT year FROM cars ORDER BY year DESC')->fetchAll(PDO::FETCH_COLUMN);$range=$pdo->query('SELECT MIN(price) min, MAX(price) max FROM cars')->fetch();out(['brands'=>$brands,'colors'=>$colors,'years'=>array_map('intval',$years),'price'=>['min'=>(int)($range['min']??0),'max'=>(int)($range['max']??0)]]); }
if($route==='cars' && $method==='GET') { $where=[];$args=[];if(!empty($_GET['search']) || !empty($_GET['q'])){$where[]='(c.name LIKE ? OR b.name LIKE ?)';$q='%'.($_GET['search'] ?? $_GET['q']).'%';$args[]=$q;$args[]=$q;}if(!empty($_GET['brand']) || !empty($_GET['brandId'])){$where[]='c.brand_id=?';$args[]=(int)($_GET['brand'] ?? $_GET['brandId']);}if(!empty($_GET['color'])){$where[]='c.color=?';$args[]=$_GET['color'];}if(!empty($_GET['year'])){$where[]='c.year=?';$args[]=(int)$_GET['year'];}if(isset($_GET['featured'])){$where[]='c.featured=?';$args[]=(int)$_GET['featured'];}if(!empty($_GET['minPrice'])){$where[]='c.price>=?';$args[]=(int)$_GET['minPrice'];}if(!empty($_GET['maxPrice'])){$where[]='c.price<=?';$args[]=(int)$_GET['maxPrice'];}$order='c.featured DESC,c.created_at DESC'; if(($_GET['sort']??'')==='price-asc')$order='c.price ASC'; if(($_GET['sort']??'')==='price-desc')$order='c.price DESC'; if(($_GET['sort']??'')==='year-desc')$order='c.year DESC'; $sql='SELECT c.id,c.name,c.brand_id brandId,b.name brandName,c.year,c.price,c.color,c.color_hex colorHex,c.description,c.thumbnail,c.images,c.sketchfab_url sketchfabUrl,c.model_path modelPath,c.featured,c.specs,c.features,c.created_at createdAt FROM cars c JOIN brands b ON b.id=c.brand_id'.($where?' WHERE '.implode(' AND ',$where):'').' ORDER BY '.$order.' LIMIT '.max(1,min(200,(int)($_GET['limit']??50)));$st=$pdo->prepare($sql);$st->execute($args);$rows=array_map('carRow',$st->fetchAll());http_response_code(200);echo json_encode(['data'=>$rows,'count'=>count($rows)],JSON_UNESCAPED_SLASHES);exit; }
if(preg_match('#^cars/(\d+)$#',$route,$m)) { $id=(int)$m[1];if($method==='GET'){$st=$pdo->prepare('SELECT c.id,c.name,c.brand_id brandId,b.name brandName,c.year,c.price,c.color,c.color_hex colorHex,c.description,c.thumbnail,c.images,c.sketchfab_url sketchfabUrl,c.model_path modelPath,c.featured,c.specs,c.features,c.created_at createdAt FROM cars c JOIN brands b ON b.id=c.brand_id WHERE c.id=?');$st->execute([$id]);$r=$st->fetch();if(!$r)fail('Car not found',404);out(carRow($r));}if($method==='DELETE'){admin();$st=$pdo->prepare('DELETE FROM cars WHERE id=?');$st->execute([$id]);out(true);}if($method==='PUT'){admin();$b=body();$st=$pdo->prepare('UPDATE cars SET name=?,brand_id=?,year=?,price=?,color=?,color_hex=?,description=?,thumbnail=?,images=?,sketchfab_url=?,model_path=?,featured=?,specs=?,features=? WHERE id=?');$st->execute([$b['name'],$b['brandId'],$b['year'],$b['price'],$b['color'],$b['colorHex'],$b['description'],$b['thumbnail'],json_encode($b['images']??[]),$b['sketchfabUrl']?:null,$b['modelPath']?:null,!empty($b['featured']),json_encode($b['specs']??[]),json_encode($b['features']??[]),$id]);out(true);} }
if($route==='cars' && $method==='POST') { admin();$b=body();$st=$pdo->prepare('INSERT INTO cars(name,brand_id,year,price,color,color_hex,description,thumbnail,images,sketchfab_url,model_path,featured,specs,features) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)');$st->execute([$b['name'],$b['brandId'],$b['year'],$b['price'],$b['color'],$b['colorHex'],$b['description'],$b['thumbnail'],json_encode($b['images']??[]),$b['sketchfabUrl']?:null,$b['modelPath']?:null,!empty($b['featured']),json_encode($b['specs']??[]),json_encode($b['features']??[])]);out(['id'=>(int)$pdo->lastInsertId()],201); }
if($route==='upload' && $method==='POST') { admin();if(empty($_FILES['files']))fail('No files uploaded');$files=$_FILES['files'];$urls=[];$allowed=['jpg','jpeg','png','webp','glb','gltf'];for($i=0;$i<count($files['name']);$i++){if($files['error'][$i]!==UPLOAD_ERR_OK)continue;$ext=strtolower(pathinfo($files['name'][$i],PATHINFO_EXTENSION));if(!in_array($ext,$allowed,true))continue;$name=bin2hex(random_bytes(8)).'.'.$ext;$target=__DIR__.'/../uploads/'.$name;if(move_uploaded_file($files['tmp_name'][$i],$target))$urls[]='http://localhost/finalcar/backend/uploads/'.$name;}out(['urls'=>$urls]); }
 if($route === 'car-variants' && $method === 'GET') {
    $carId = isset($_GET['car_id']) ? (int)$_GET['car_id'] : 0;

    if($carId <= 0) {
        fail('car_id is required');
    }

    $st = $pdo->prepare(
        'SELECT
            id,
            car_id AS carId,
            color_name AS colorName,
            color_hex AS colorHex,
            thumbnail_url AS thumbnailUrl,
            model_url AS modelUrl,
            is_default AS isDefault,
            sort_order AS sortOrder
         FROM car_variants
         WHERE car_id = ?
         ORDER BY sort_order ASC, id ASC'
    );

    $st->execute([$carId]);

    $variants = $st->fetchAll();

    foreach($variants as &$variant) {
        $variant['id'] = (int)$variant['id'];
        $variant['carId'] = (int)$variant['carId'];
        $variant['isDefault'] = (bool)$variant['isDefault'];
        $variant['sortOrder'] = (int)$variant['sortOrder'];
    }
    unset($variant);

    out($variants);
}   
fail('Route not found',404);
