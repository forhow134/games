const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const modelsDir = './public/models';
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.glb') && !f.includes('-test'));

console.log(`Found ${files.length} GLB files to compress...\n`);

let totalOriginal = 0;
let totalCompressed = 0;

files.forEach(file => {
  const inputPath = path.join(modelsDir, file);
  const tempPath = path.join(modelsDir, `${file}.temp.glb`);
  
  const originalSize = fs.statSync(inputPath).size;
  
  try {
    console.log(`Compressing ${file}...`);
    
    // 使用 Draco 压缩，压缩等级 7（平衡质量和体积）
    execSync(`npx gltf-pipeline -i "${inputPath}" -o "${tempPath}" --draco.compressionLevel=7`, {
      stdio: 'pipe',
      timeout: 300000
    });
    
    // 检查输出文件是否生成
    if (!fs.existsSync(tempPath)) {
      console.error(`  ✗ Failed: output file not created`);
      return;
    }
    
    const compressedSize = fs.statSync(tempPath).size;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    // 替换原文件
    fs.renameSync(tempPath, inputPath);
    
    totalOriginal += originalSize;
    totalCompressed += compressedSize;
    
    console.log(`  ✓ ${(originalSize/1024/1024).toFixed(1)}MB → ${(compressedSize/1024/1024).toFixed(1)}MB (${ratio}% reduction)`);
  } catch (err) {
    console.error(`  ✗ Failed to compress ${file}:`, err.message);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
    }
  }
});

if (totalOriginal > 0 && totalCompressed > 0) {
  const totalRatio = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);
  console.log(`\n========================================`);
  console.log(`Total: ${(totalOriginal/1024/1024).toFixed(1)}MB → ${(totalCompressed/1024/1024).toFixed(1)}MB (${totalRatio}% reduction)`);
  console.log(`========================================`);
} else {
  console.log('\nNo files were compressed successfully.');
}
